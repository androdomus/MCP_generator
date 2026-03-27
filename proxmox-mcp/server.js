#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         Proxmox Universal MCP Server v1.0.0             ║
 * ║  Compatible: Claude Desktop · Claude Code · Cursor      ║
 * ║              Windsurf · Cline · n8n · tout client MCP   ║
 * ╠══════════════════════════════════════════════════════════╣
 * ║  Transport : stdio (défaut) ou HTTP (--http)            ║
 * ║  Auth      : variables d'environnement uniquement       ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Variables d'environnement requises :
 *   PROXMOX_TOKEN_ID      Token ID    (ex: root@pam!mon-token)
 *   PROXMOX_TOKEN_SECRET  Token UUID  (ex: xxxxxxxx-xxxx-...)
 *
 * Variables optionnelles :
 *   PROXMOX_NODE_PRXPROD  URL nœud prod  (défaut: https://192.168.1.22:8006/api2/json)
 *   PROXMOX_NODE_PRXDEV   URL nœud dev   (défaut: https://192.168.1.60:8006/api2/json)
 *   PROXMOX_VERIFY_SSL    Vérifier SSL   (défaut: false)
 *   MCP_HTTP_PORT         Port HTTP      (défaut: 3100, si mode --http)
 *
 * Usage :
 *   node server.js               # mode stdio
 *   node server.js --http        # mode HTTP streamable sur MCP_HTTP_PORT
 */

"use strict";

const { Server }              = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport }= require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const https  = require("https");
const http   = require("http");

const CONFIG = {
  nodes: {
    prxprod: process.env.PROXMOX_NODE_PRXPROD || "https://192.168.1.22:8006/api2/json",
    prxdev:  process.env.PROXMOX_NODE_PRXDEV  || "https://192.168.1.60:8006/api2/json",
  },
  tokenId:     process.env.PROXMOX_TOKEN_ID     || "",
  tokenSecret: process.env.PROXMOX_TOKEN_SECRET || "",
  verifySSL:   process.env.PROXMOX_VERIFY_SSL === "true",
  httpPort:    parseInt(process.env.MCP_HTTP_PORT || "3100", 10),
};

const NODE_KEYS = Object.keys(CONFIG.nodes);

function pveRequest(method, nodeKey, endpoint, postData) {
  return new Promise((resolve, reject) => {
    if (!CONFIG.tokenId || !CONFIG.tokenSecret)
      return reject(new Error("Missing credentials. Set PROXMOX_TOKEN_ID and PROXMOX_TOKEN_SECRET."));
    const baseUrl = CONFIG.nodes[nodeKey];
    if (!baseUrl)
      return reject(new Error(`Unknown node: '${nodeKey}'. Valid: ${NODE_KEYS.join(", ")}`));

    const url  = new URL(baseUrl + endpoint);
    const body = (["POST","PUT","DELETE"].includes(method) && postData && Object.keys(postData).length)
      ? new URLSearchParams(postData).toString() : undefined;

    const opts = {
      hostname: url.hostname,
      port:     parseInt(url.port) || (url.protocol === "https:" ? 443 : 80),
      path:     url.pathname + url.search, method,
      headers:  { Authorization: `PVEAPIToken=${CONFIG.tokenId}=${CONFIG.tokenSecret}`,
                  "Content-Type": "application/x-www-form-urlencoded" },
      rejectUnauthorized: CONFIG.verifySSL, timeout: 20000,
    };
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);

    const req = (url.protocol === "https:" ? https : http).request(opts, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400)
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.errors ? JSON.stringify(parsed.errors) : (parsed.message || data.slice(0,300))}`));
          else resolve(parsed.data ?? parsed);
        } catch { reject(new Error(`Parse error (HTTP ${res.statusCode}): ${data.slice(0,200)}`)); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out after 20s")); });
    if (body) req.write(body);
    req.end();
  });
}

const pveGet    = (n, ep)    => pveRequest("GET",    n, ep, null);
const pvePost   = (n, ep, d) => pveRequest("POST",   n, ep, d || {});
const pvePut    = (n, ep, d) => pveRequest("PUT",    n, ep, d || {});
const pveDelete = (n, ep)    => pveRequest("DELETE", n, ep, {});

function handleError(e) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("ECONNREFUSED"))               return "Connection refused — Proxmox unreachable (réseau/VPN ?)";
  if (m.includes("ETIMEDOUT")||m.includes("timed")) return "Timeout — Proxmox surchargé ou inaccessible";
  if (m.includes("HTTP 401"))                   return "Auth échouée — vérifier PROXMOX_TOKEN_ID / PROXMOX_TOKEN_SECRET";
  if (m.includes("HTTP 403"))                   return "Accès refusé — token insuffisant pour cette opération";
  if (m.includes("HTTP 404"))                   return "Ressource introuvable — vérifier node, VMID ou nom snapshot";
  if (m.includes("HTTP 500"))                   return "Erreur interne Proxmox — consulter les logs PVE";
  return m;
}

const R = {
  ok:   data => JSON.stringify({ success: true,  data },            null, 2),
  err:  e    => JSON.stringify({ success: false, error: handleError(e) }, null, 2),
  task: upid => JSON.stringify({ success: true,  task_upid: upid },      null, 2),
  gate: msg  => JSON.stringify({ status: "confirmation_required", message: msg }),
};

const NODE_ENUM = { type: "string", enum: NODE_KEYS, description: `Nœud Proxmox: ${NODE_KEYS.join(" | ")}` };
const VMID_DEF  = { type: "integer", description: "VMID de la VM (ex: 112)" };
const CONF_DEF  = { type: "boolean", description: "Doit être true pour confirmer. Garde-fou de sécurité." };

const TOOLS = [
  // ── CLUSTER / LECTURE ────────────────────────────────────────────────────
  { name: "pve_cluster_resources", description: "Vue complète cluster : VMs, LXC, nœuds, stockages. Filtre optionnel par type.",
    inputSchema: { type: "object", properties: { resource_type: { type: "string", enum: ["vm","storage","node","sdn"] } } } },
  { name: "pve_node_status",       description: "Status détaillé d'un nœud : CPU, RAM, uptime, version PVE.",
    inputSchema: { type: "object", required: ["node"], properties: { node: NODE_ENUM } } },
  { name: "pve_vm_status",         description: "Status runtime VM : état power, CPU%, RAM, uptime, IPs.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_vm_config",         description: "Configuration complète VM : CPU, RAM, disques, réseau, boot order.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_lxc_status",        description: "Status runtime d'un container LXC.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_list_snapshots",    description: "Liste snapshots d'une VM avec nom, description, date.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_list_tasks",        description: "Tâches récentes sur un nœud. Filtre par VMID ou type.",
    inputSchema: { type: "object", required: ["node"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      limit: { type: "integer", default: 25, minimum: 1, maximum: 200 },
      typefilter: { type: "string", description: "Ex: 'backup', 'qmstart', 'qmstop', 'migrateall'" } } } },
  { name: "pve_task_log",          description: "Log complet d'une tâche par UPID.",
    inputSchema: { type: "object", required: ["node","upid"], properties: {
      node: NODE_ENUM, upid: { type: "string", description: "UPID de la tâche" } } } },
  { name: "pve_storage_content",   description: "Contenu d'un stockage : images, backups, ISO...",
    inputSchema: { type: "object", required: ["node","storage"], properties: {
      node: NODE_ENUM,
      storage: { type: "string", description: "Ex: 'local', 'local-lvm', 'PC_NZO'" },
      content: { type: "string", description: "Filtre: 'images', 'backup', 'iso', 'rootdir'" } } } },
  { name: "pve_not_backed_up",     description: "VMs/LXC sans backup récent (cluster entier).",
    inputSchema: { type: "object", properties: {} } },
  { name: "pve_list_backup_jobs",  description: "Jobs de backup planifiés dans le cluster.",
    inputSchema: { type: "object", properties: {} } },

  // ── VM LIFECYCLE ─────────────────────────────────────────────────────────
  { name: "pve_vm_start",    description: "Démarrer une VM QEMU.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_vm_reboot",   description: "Redémarrer proprement une VM (signal ACPI).",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_vm_shutdown", description: "Arrêt propre VM via ACPI. confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF, confirmed: CONF_DEF,
      timeout: { type: "integer", default: 60 } } } },
  { name: "pve_vm_stop",     description: "⚠️ Arrêt brutal VM (coupure courant). confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF, confirmed: CONF_DEF } } },
  { name: "pve_vm_suspend",  description: "Suspendre une VM en RAM ou sur disque.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF, todisk: { type: "boolean", default: false } } } },
  { name: "pve_vm_resume",   description: "Reprendre une VM suspendue.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },

  // ── VM CONFIG ────────────────────────────────────────────────────────────
  { name: "pve_vm_set_config",  description: "Modifier config VM : CPU, RAM, nom, description, tags, onboot.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      cores: { type: "integer" }, memory: { type: "integer", description: "RAM en MB" },
      name: { type: "string" }, description: { type: "string" },
      tags: { type: "string", description: "Séparés par ';'" },
      onboot: { type: "integer", enum: [0,1] } } } },
  { name: "pve_vm_resize_disk", description: "Agrandir un disque VM. Ex size: '+10G' ou '50G'.",
    inputSchema: { type: "object", required: ["node","vmid","disk","size"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      disk: { type: "string", description: "Ex: 'scsi0', 'virtio0'" },
      size: { type: "string", description: "Ex: '+10G' ou '50G'" } } } },

  // ── SNAPSHOTS ────────────────────────────────────────────────────────────
  { name: "pve_snapshot_create",   description: "Créer un snapshot VM. Peut inclure l'état RAM.",
    inputSchema: { type: "object", required: ["node","vmid","snapname"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      snapname: { type: "string", description: "Nom alphanumérique, sans espaces" },
      description: { type: "string" }, vmstate: { type: "boolean", default: false } } } },
  { name: "pve_snapshot_delete",   description: "⚠️ Supprimer un snapshot. Irréversible. confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid","snapname","confirmed"],
      properties: { node: NODE_ENUM, vmid: VMID_DEF, snapname: { type: "string" }, confirmed: CONF_DEF } } },
  { name: "pve_snapshot_rollback", description: "⚠️ DESTRUCTIF — Rollback VM vers snapshot. Perte de toutes les modifications. confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid","snapname","confirmed"],
      properties: { node: NODE_ENUM, vmid: VMID_DEF, snapname: { type: "string" }, confirmed: CONF_DEF } } },

  // ── BACKUP / MIGRATION / CLONE ───────────────────────────────────────────
  { name: "pve_backup_vm",  description: "Backup à la demande d'une VM. Modes: snapshot, suspend, stop.",
    inputSchema: { type: "object", required: ["node","vmid","storage"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      storage:  { type: "string" },
      mode:     { type: "string", enum: ["snapshot","suspend","stop"], default: "snapshot" },
      compress: { type: "string", enum: ["zstd","lzo","gzip","0"],    default: "zstd" },
      notes:    { type: "string" } } } },
  { name: "pve_vm_migrate", description: "Migrer une VM entre nœuds. Migration live si stockage partagé.",
    inputSchema: { type: "object", required: ["node","vmid","target"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      target:           { type: "string", enum: NODE_KEYS },
      online:           { type: "boolean", default: false },
      with_local_disks: { type: "boolean", default: true } } } },
  { name: "pve_vm_clone",   description: "Cloner une VM ou template. Clone complet ou lié.",
    inputSchema: { type: "object", required: ["node","vmid","newid"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF,
      newid:    { type: "integer" }, name: { type: "string" },
      full:     { type: "boolean", default: true },
      storage:  { type: "string" }, snapname: { type: "string" } } } },
  { name: "pve_vm_delete",  description: "⚠️ SUPPRESSION PERMANENTE VM + disques. VM doit être arrêtée. confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid","confirmed"], properties: {
      node: NODE_ENUM, vmid: VMID_DEF, confirmed: CONF_DEF,
      purge: { type: "boolean", default: true } } } },

  // ── LXC ──────────────────────────────────────────────────────────────────
  { name: "pve_lxc_start",    description: "Démarrer un container LXC.",
    inputSchema: { type: "object", required: ["node","vmid"], properties: { node: NODE_ENUM, vmid: VMID_DEF } } },
  { name: "pve_lxc_shutdown", description: "Arrêt propre d'un LXC. confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid","confirmed"], properties: { node: NODE_ENUM, vmid: VMID_DEF, confirmed: CONF_DEF } } },
  { name: "pve_lxc_stop",     description: "⚠️ Arrêt forcé d'un LXC. confirmed=true requis.",
    inputSchema: { type: "object", required: ["node","vmid","confirmed"], properties: { node: NODE_ENUM, vmid: VMID_DEF, confirmed: CONF_DEF } } },
];

async function callTool(name, a) {
  try {
    switch (name) {
      case "pve_cluster_resources": {
        const ep = a.resource_type ? `/cluster/resources?type=${a.resource_type}` : "/cluster/resources";
        return R.ok(Array.isArray(await pveGet("prxprod", ep)) ? await pveGet("prxprod", ep) : [await pveGet("prxprod", ep)]);
      }
      case "pve_node_status":     return R.ok(await pveGet(a.node, `/nodes/${a.node}/status`));
      case "pve_vm_status":       return R.ok(await pveGet(a.node, `/nodes/${a.node}/qemu/${a.vmid}/status/current`));
      case "pve_vm_config":       return R.ok(await pveGet(a.node, `/nodes/${a.node}/qemu/${a.vmid}/config`));
      case "pve_lxc_status":      return R.ok(await pveGet(a.node, `/nodes/${a.node}/lxc/${a.vmid}/status/current`));
      case "pve_list_snapshots":  { const d = await pveGet(a.node, `/nodes/${a.node}/qemu/${a.vmid}/snapshot`); return R.ok(Array.isArray(d)?d:[d]); }
      case "pve_list_tasks":      { let ep=`/nodes/${a.node}/tasks?limit=${a.limit||25}`; if(a.vmid)ep+=`&vmid=${a.vmid}`; if(a.typefilter)ep+=`&typefilter=${a.typefilter}`; const d=await pveGet(a.node,ep); return R.ok(Array.isArray(d)?d:[d]); }
      case "pve_task_log":        return R.ok(await pveGet(a.node, `/nodes/${a.node}/tasks/${encodeURIComponent(a.upid)}/log`));
      case "pve_storage_content": { let ep=`/nodes/${a.node}/storage/${a.storage}/content`; if(a.content)ep+=`?content=${a.content}`; const d=await pveGet(a.node,ep); return R.ok(Array.isArray(d)?d:[d]); }
      case "pve_not_backed_up":   { const d=await pveGet("prxprod","/cluster/backup-info/not-backed-up"); return R.ok(Array.isArray(d)?d:[d]); }
      case "pve_list_backup_jobs":{ const d=await pveGet("prxprod","/cluster/backup"); return R.ok(Array.isArray(d)?d:[d]); }

      case "pve_vm_start":    return R.task(await pvePost(a.node, `/nodes/${a.node}/qemu/${a.vmid}/status/start`));
      case "pve_vm_reboot":   return R.task(await pvePost(a.node, `/nodes/${a.node}/qemu/${a.vmid}/status/reboot`));
      case "pve_vm_resume":   return R.task(await pvePost(a.node, `/nodes/${a.node}/qemu/${a.vmid}/status/resume`));
      case "pve_vm_suspend":  return R.task(await pvePost(a.node, `/nodes/${a.node}/qemu/${a.vmid}/status/suspend`, { todisk: a.todisk?"1":"0" }));
      case "pve_vm_shutdown": if(!a.confirmed)return R.gate(`Confirmer arrêt propre VM ${a.vmid}. Set confirmed=true.`); return R.task(await pvePost(a.node,`/nodes/${a.node}/qemu/${a.vmid}/status/shutdown`,{timeout:String(a.timeout||60)}));
      case "pve_vm_stop":     if(!a.confirmed)return R.gate(`⚠️ Arrêt brutal VM ${a.vmid}. Set confirmed=true.`); return R.task(await pvePost(a.node,`/nodes/${a.node}/qemu/${a.vmid}/status/stop`));

      case "pve_vm_set_config": {
        const p={};
        if(a.cores!=null)p.cores=String(a.cores); if(a.memory!=null)p.memory=String(a.memory);
        if(a.name!=null)p.name=a.name; if(a.description!=null)p.description=a.description;
        if(a.tags!=null)p.tags=a.tags; if(a.onboot!=null)p.onboot=String(a.onboot);
        if(!Object.keys(p).length)return R.err(new Error("Aucun paramètre fourni."));
        await pvePut(a.node,`/nodes/${a.node}/qemu/${a.vmid}/config`,p);
        return R.ok({message:`VM ${a.vmid} mise à jour.`,updated:p});
      }
      case "pve_vm_resize_disk":
        await pvePut(a.node,`/nodes/${a.node}/qemu/${a.vmid}/resize`,{disk:a.disk,size:a.size});
        return R.ok({message:`Disque ${a.disk} redimensionné à ${a.size}.`});

      case "pve_snapshot_create":  { const p={snapname:a.snapname}; if(a.description)p.description=a.description; if(a.vmstate)p.vmstate="1"; return R.task(await pvePost(a.node,`/nodes/${a.node}/qemu/${a.vmid}/snapshot`,p)); }
      case "pve_snapshot_delete":  if(!a.confirmed)return R.gate(`Confirmer suppression snapshot '${a.snapname}' VM ${a.vmid}.`); return R.task(await pveDelete(a.node,`/nodes/${a.node}/qemu/${a.vmid}/snapshot/${a.snapname}`));
      case "pve_snapshot_rollback":if(!a.confirmed)return R.gate(`⚠️ Rollback VM ${a.vmid} vers '${a.snapname}' — modifications perdues. Set confirmed=true.`); return R.task(await pvePost(a.node,`/nodes/${a.node}/qemu/${a.vmid}/snapshot/${a.snapname}/rollback`));

      case "pve_backup_vm":  { const p={vmid:String(a.vmid),storage:a.storage,mode:a.mode||"snapshot",compress:a.compress||"zstd"}; if(a.notes)p.notes=a.notes; return R.task(await pvePost(a.node,`/nodes/${a.node}/vzdump`,p)); }
      case "pve_vm_migrate": { const p={target:a.target,online:a.online?"1":"0"}; if(!a.online)p["with-local-disks"]=a.with_local_disks!==false?"1":"0"; return R.task(await pvePost(a.node,`/nodes/${a.node}/qemu/${a.vmid}/migrate`,p)); }
      case "pve_vm_clone":   { const p={newid:String(a.newid),full:a.full!==false?"1":"0"}; if(a.name)p.name=a.name; if(a.storage)p.storage=a.storage; if(a.snapname)p.snapname=a.snapname; return R.task(await pvePost(a.node,`/nodes/${a.node}/qemu/${a.vmid}/clone`,p)); }
      case "pve_vm_delete":  if(!a.confirmed)return R.gate(`⚠️ SUPPRESSION PERMANENTE VM ${a.vmid}. Set confirmed=true.`); return R.task(await pveDelete(a.node,`/nodes/${a.node}/qemu/${a.vmid}${a.purge!==false?"?purge=1":""}`));

      case "pve_lxc_start":    return R.task(await pvePost(a.node,`/nodes/${a.node}/lxc/${a.vmid}/status/start`));
      case "pve_lxc_shutdown": if(!a.confirmed)return R.gate(`Confirmer arrêt propre LXC ${a.vmid}.`); return R.task(await pvePost(a.node,`/nodes/${a.node}/lxc/${a.vmid}/status/shutdown`));
      case "pve_lxc_stop":     if(!a.confirmed)return R.gate(`⚠️ Arrêt forcé LXC ${a.vmid}. Set confirmed=true.`); return R.task(await pvePost(a.node,`/nodes/${a.node}/lxc/${a.vmid}/status/stop`));

      default: return R.err(new Error(`Outil inconnu: ${name}`));
    }
  } catch(e) { return R.err(e); }
}

const server = new Server(
  { name: "proxmox_mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema,  async req => ({
  content: [{ type: "text", text: await callTool(req.params.name, req.params.arguments || {}) }]
}));

async function main() {
  const useHttp = process.argv.includes("--http");
  if (useHttp) {
    try {
      const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
      await server.connect(new StreamableHTTPServerTransport({ port: CONFIG.httpPort }));
      process.stderr.write(`[proxmox-mcp] HTTP — port ${CONFIG.httpPort}\n`);
    } catch {
      process.stderr.write("[proxmox-mcp] streamableHttp indisponible — fallback stdio\n");
      await server.connect(new StdioServerTransport());
    }
  } else {
    await server.connect(new StdioServerTransport());
    process.stderr.write("[proxmox-mcp] stdio ready\n");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
