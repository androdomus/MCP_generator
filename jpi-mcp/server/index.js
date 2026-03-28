#!/usr/bin/env node
/**
 * JPI MCP Server
 * Contrôle le téléphone Android via l'API JPI.
 * Env: JPI_HOST, JPI_PORT, LAURENT_PHONE
 */
"use strict";
const { Server }               = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const http = require("http");

const JPI_HOST  = process.env.JPI_HOST      || "192.168.1.118";
const JPI_PORT  = parseInt(process.env.JPI_PORT || "8081", 10);
const JPI_PHONE = process.env.LAURENT_PHONE || "0778817834";
const BASE_URL  = `http://${JPI_HOST}:${JPI_PORT}`;

function jpiGet(params) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/?${new URLSearchParams(params).toString()}`;
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve({ status: res.statusCode, body: data.trim() }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("JPI timeout — app JPI active sur le téléphone ?")); });
  });
}

function handleError(e) {
  const m = e instanceof Error ? e.message : String(e);
  if (m.includes("ECONNREFUSED")) return "Connexion refusée — lancer l'app JPI sur le téléphone";
  if (m.includes("timeout"))      return "Timeout — téléphone éteint ou hors réseau ?";
  if (m.includes("ENOTFOUND"))    return `Hôte introuvable — vérifier JPI_HOST (${JPI_HOST})`;
  return m;
}

const R = {
  ok:   d   => JSON.stringify({ success: true, ...d }, null, 2),
  err:  e   => JSON.stringify({ success: false, error: handleError(e) }, null, 2),
  gate: msg => JSON.stringify({ status: "confirmation_required", message: msg }),
};

const TOOLS = [
  { name: "jpi_device_info",    description: "Informations appareil Android + vérification JPI actif.", inputSchema: { type: "object", properties: {} } },
  { name: "jpi_send_sms",       description: "Envoyer un SMS depuis le téléphone.",
    inputSchema: { type: "object", required: ["message"], properties: { message: { type: "string" }, number: { type: "string", description: `Défaut: ${JPI_PHONE}` } } } },
  { name: "jpi_make_call",      description: "Passer un appel. confirmed=true requis.",
    inputSchema: { type: "object", properties: { number: { type: "string" }, confirmed: { type: "boolean" } } } },
  { name: "jpi_show_toast",     description: "Notification toast sur l'écran.",
    inputSchema: { type: "object", required: ["message"], properties: { message: { type: "string" } } } },
  { name: "jpi_text_to_speech", description: "Text-to-Speech : faire parler le téléphone.",
    inputSchema: { type: "object", required: ["message"], properties: { message: { type: "string" } } } },
  { name: "jpi_take_picture",   description: "Déclencher la caméra pour prendre une photo.", inputSchema: { type: "object", properties: {} } },
  { name: "jpi_set_variable",   description: "Écrire une variable persistante dans JPI.",
    inputSchema: { type: "object", required: ["name","value"], properties: { name: { type: "string" }, value: { type: "string" } } } },
  { name: "jpi_get_variable",   description: "Lire une variable depuis JPI.",
    inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } },
];

async function callTool(name, a) {
  try {
    switch (name) {
      case "jpi_device_info":    { const r = await jpiGet({ action: "deviceInfo" }); return R.ok({ status: r.status, response: r.body, host: `${JPI_HOST}:${JPI_PORT}` }); }
      case "jpi_send_sms":       { const n = a.number||JPI_PHONE; const r = await jpiGet({ action:"sendSms", number:n, message:a.message }); return R.ok({ status:r.status, response:r.body, to:n }); }
      case "jpi_make_call":      { if(!a.confirmed) return R.gate(`Confirmer l'appel vers ${a.number||JPI_PHONE}. Set confirmed=true.`); const n=a.number||JPI_PHONE; const r=await jpiGet({action:"makeCall",number:n}); return R.ok({status:r.status,response:r.body||"Appel initié",to:n}); }
      case "jpi_show_toast":     { const r = await jpiGet({ action:"showToast", message:a.message }); return R.ok({ status:r.status, response:r.body }); }
      case "jpi_text_to_speech": { const r = await jpiGet({ action:"textToSpeech", message:a.message }); return R.ok({ status:r.status, response:r.body, spoken:a.message }); }
      case "jpi_take_picture":   { const r = await jpiGet({ action:"takePicture" }); return R.ok({ status:r.status, response:r.body }); }
      case "jpi_set_variable":   { const r = await jpiGet({ action:"setVariable", name:a.name, value:a.value }); return R.ok({ status:r.status, response:r.body, name:a.name, value:a.value }); }
      case "jpi_get_variable":   { const r = await jpiGet({ action:"getVariable", name:a.name }); return R.ok({ status:r.status, response:r.body, name:a.name }); }
      default: return R.err(new Error(`Outil inconnu: ${name}`));
    }
  } catch(e) { return R.err(e); }
}

const server = new Server({ name: "jpi_mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema,  async req => ({ content: [{ type: "text", text: await callTool(req.params.name, req.params.arguments || {}) }] }));
async function main() { await server.connect(new StdioServerTransport()); process.stderr.write("[jpi-mcp] ready\n"); }
main().catch(e => { console.error(e); process.exit(1); });
