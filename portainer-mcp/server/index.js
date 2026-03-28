#!/usr/bin/env node
/**
 * Portainer MCP Server
 * Gère containers Docker et stacks via l'API Portainer.
 * Env: PORTAINER_URL, PORTAINER_API_KEY, PORTAINER_ENDPOINT
 */
"use strict";
const { Server }               = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const https = require("https");
const http  = require("http");

const PORTAINER_URL = process.env.PORTAINER_URL      || "https://192.168.1.26:9443";
const API_KEY       = process.env.PORTAINER_API_KEY  || "";
const EP            = process.env.PORTAINER_ENDPOINT || "2";

function portainerRequest(method, path, queryParams) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) return reject(new Error("PORTAINER_API_KEY non définie."));
    const base     = new URL(PORTAINER_URL);
    const fullPath = path + (queryParams ? "?" + new URLSearchParams(queryParams).toString() : "");
    const useHttps = base.protocol === "https:";
    const opts = {
      hostname: base.hostname,
      port: parseInt(base.port) || (useHttps ? 443 : 80),
      method, path: fullPath,
      headers: { "X-API-Key": API_KEY },
      rejectUnauthorized: false, timeout: 12000,
    };
    const req = (useHttps ? https : http).request(opts, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0,200)}`)); return; }
        if (res.statusCode === 204 || !raw.trim()) { resolve({ status: res.statusCode, data: null }); return; }
        try { resolve({ status: res.statusCode, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout — Portainer inaccessible ?")); });
    req.end();
  });
}

const pGet  = (path, params) => portainerRequest("GET",  path, params);
const pPost = (path)         => portainerRequest("POST", path, null);

function handleError(e) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("ECONNREFUSED")) return `Connexion refusée — Portainer inaccessible (${PORTAINER_URL})`;
  if (m.includes("timeout"))      return "Timeout — Portainer ne répond pas";
  if (m.includes("HTTP 401"))     return "Auth échouée — vérifier PORTAINER_API_KEY";
  if (m.includes("HTTP 403"))     return "Accès refusé — token insuffisant";
  if (m.includes("HTTP 404"))     return "Ressource introuvable — vérifier l'ID container/stack";
  if (m.includes("API_KEY"))      return m;
  return m;
}

const R = {
  ok:   d   => JSON.stringify({ success: true, data: d }, null, 2),
  err:  e   => JSON.stringify({ success: false, error: handleError(e) }, null, 2),
  gate: msg => JSON.stringify({ status: "confirmation_required", message: msg }),
};

const TOOLS = [
  { name: "portainer_status",           description: "Version et statut de l'instance Portainer.", inputSchema: { type:"object", properties:{} } },
  { name: "portainer_endpoints",        description: "Liste les environnements Docker dans Portainer.", inputSchema: { type:"object", properties:{} } },
  { name: "portainer_list_containers",  description: "Liste containers Docker. all=true pour inclure les arrêtés.",
    inputSchema: { type:"object", properties: { all: {type:"boolean",default:false}, filters: {type:"string"} } } },
  { name: "portainer_inspect_container",description: "Inspection détaillée d'un container (config, réseau, mounts, env).",
    inputSchema: { type:"object", required:["id"], properties: { id:{type:"string",description:"ID ou nom container"} } } },
  { name: "portainer_container_logs",   description: "Logs d'un container (stdout+stderr).",
    inputSchema: { type:"object", required:["id"], properties: { id:{type:"string"}, tail:{type:"integer",default:50}, stdout:{type:"boolean",default:true}, stderr:{type:"boolean",default:true} } } },
  { name: "portainer_restart_container",description: "Redémarrer un container. confirmed=true requis.",
    inputSchema: { type:"object", required:["id"], properties: { id:{type:"string"}, confirmed:{type:"boolean"} } } },
  { name: "portainer_start_container",  description: "Démarrer un container arrêté.",
    inputSchema: { type:"object", required:["id"], properties: { id:{type:"string"} } } },
  { name: "portainer_stop_container",   description: "⚠️ Arrêter un container. confirmed=true requis.",
    inputSchema: { type:"object", required:["id"], properties: { id:{type:"string"}, confirmed:{type:"boolean"} } } },
  { name: "portainer_list_stacks",      description: "Liste les stacks Docker Compose dans Portainer.", inputSchema: { type:"object", properties:{} } },
  { name: "portainer_stack_containers", description: "Containers d'une stack spécifique.",
    inputSchema: { type:"object", required:["stack_name"], properties: { stack_name:{type:"string",description:"Ex: 'n8n', 'hass-d'"} } } },
  { name: "portainer_list_images",      description: "Images Docker disponibles sur l'endpoint.", inputSchema: { type:"object", properties:{} } },
  { name: "portainer_list_networks",    description: "Réseaux Docker sur l'endpoint.", inputSchema: { type:"object", properties:{} } },
  { name: "portainer_list_volumes",     description: "Volumes Docker sur l'endpoint.", inputSchema: { type:"object", properties:{} } },
  { name: "portainer_docker_info",      description: "Info moteur Docker (version, CPU, RAM, containers, images).", inputSchema: { type:"object", properties:{} } },
];

async function callTool(name, a) {
  try {
    switch (name) {
      case "portainer_status":    { const [v,s]=await Promise.all([pGet("/api/system/version"),pGet("/api/system/status")]); return R.ok({version:v.data,status:s.data}); }
      case "portainer_endpoints": { return R.ok((await pGet("/api/endpoints")).data); }
      case "portainer_list_containers": {
        const params={all:a.all?"true":"false"}; if(a.filters)params.filters=a.filters;
        const r=await pGet(`/api/endpoints/${EP}/docker/containers/json`,params);
        return R.ok({count:(r.data||[]).length,containers:(r.data||[]).map(c=>({id:c.Id?.slice(0,12),names:c.Names,image:c.Image,status:c.Status,state:c.State,ports:c.Ports}))});
      }
      case "portainer_inspect_container": return R.ok((await pGet(`/api/endpoints/${EP}/docker/containers/${a.id}/json`)).data);
      case "portainer_container_logs": {
        const params={tail:String(a.tail||50),stdout:a.stdout!==false?"true":"false",stderr:a.stderr!==false?"true":"false"};
        const r=await pGet(`/api/endpoints/${EP}/docker/containers/${a.id}/logs`,params);
        const raw=typeof r.data==="string"?r.data:JSON.stringify(r.data);
        const cleaned=raw.split("\n").map(l=>l.length>8?l.slice(8):l).join("\n").trim();
        return R.ok({container:a.id,logs:cleaned});
      }
      case "portainer_restart_container": if(!a.confirmed)return R.gate(`Confirmer restart '${a.id}'. Set confirmed=true.`); return R.ok({status:(await pPost(`/api/endpoints/${EP}/docker/containers/${a.id}/restart`)).status,message:`'${a.id}' redémarré`});
      case "portainer_start_container":   return R.ok({status:(await pPost(`/api/endpoints/${EP}/docker/containers/${a.id}/start`)).status,message:`'${a.id}' démarré`});
      case "portainer_stop_container":    if(!a.confirmed)return R.gate(`⚠️ Confirmer arrêt '${a.id}'. Set confirmed=true.`); return R.ok({status:(await pPost(`/api/endpoints/${EP}/docker/containers/${a.id}/stop`)).status,message:`'${a.id}' arrêté`});
      case "portainer_list_stacks": {
        const r=await pGet("/api/stacks");
        return R.ok({count:(r.data||[]).length,stacks:(r.data||[]).map(s=>({id:s.Id,name:s.Name,status:s.Status,type:s.Type}))});
      }
      case "portainer_stack_containers": {
        const params={all:"true",filters:JSON.stringify({label:[`com.docker.compose.project=${a.stack_name}`]})};
        const r=await pGet(`/api/endpoints/${EP}/docker/containers/json`,params);
        return R.ok({stack:a.stack_name,containers:(r.data||[]).map(c=>({id:c.Id?.slice(0,12),names:c.Names,image:c.Image,status:c.Status}))});
      }
      case "portainer_list_images":   { const r=await pGet(`/api/endpoints/${EP}/docker/images/json`); return R.ok({count:(r.data||[]).length,images:(r.data||[]).map(i=>({id:i.Id?.slice(7,19),tags:i.RepoTags,size_mb:Math.round((i.Size||0)/1048576)}))}); }
      case "portainer_list_networks": { const r=await pGet(`/api/endpoints/${EP}/docker/networks`); return R.ok({count:(r.data||[]).length,networks:(r.data||[]).map(n=>({id:n.Id?.slice(0,12),name:n.Name,driver:n.Driver,scope:n.Scope}))}); }
      case "portainer_list_volumes":  { const r=await pGet(`/api/endpoints/${EP}/docker/volumes`); return R.ok({count:(r.data?.Volumes||[]).length,volumes:(r.data?.Volumes||[]).map(v=>({name:v.Name,driver:v.Driver,mountpoint:v.Mountpoint}))}); }
      case "portainer_docker_info":   { const d=(await pGet(`/api/endpoints/${EP}/docker/info`)).data||{}; return R.ok({containers:d.Containers,running:d.ContainersRunning,images:d.Images,docker_version:d.ServerVersion,os:d.OperatingSystem,memory_gb:d.MemTotal?Math.round(d.MemTotal/1073741824*10)/10:null,cpus:d.NCPU}); }
      default: return R.err(new Error(`Outil inconnu: ${name}`));
    }
  } catch(e) { return R.err(e); }
}

const server = new Server({ name: "portainer_mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema,  async req => ({ content: [{ type: "text", text: await callTool(req.params.name, req.params.arguments || {}) }] }));
async function main() { await server.connect(new StdioServerTransport()); process.stderr.write("[portainer-mcp] ready\n"); }
main().catch(e => { console.error(e); process.exit(1); });
