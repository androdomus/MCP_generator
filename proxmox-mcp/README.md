# proxmox-mcp — Serveur MCP Universel

Serveur MCP pour administrer un cluster Proxmox VE.
Compatible avec **tout client MCP** : Claude Desktop, Claude Code, Cursor, Windsurf, Cline, n8n.

---

## Variables d'environnement

| Variable | Requis | Défaut | Description |
|----------|--------|--------|-------------|
| `PROXMOX_TOKEN_ID` | ✅ | — | Token ID (ex: `root@pam!mon-token`) |
| `PROXMOX_TOKEN_SECRET` | ✅ | — | UUID secret du token |
| `PROXMOX_NODE_PRXPROD` | ❌ | `https://192.168.1.22:8006/api2/json` | URL nœud prod |
| `PROXMOX_NODE_PRXDEV` | ❌ | `https://192.168.1.60:8006/api2/json` | URL nœud dev |
| `PROXMOX_VERIFY_SSL` | ❌ | `false` | Vérification SSL |
| `MCP_HTTP_PORT` | ❌ | `3100` | Port HTTP (mode `--http`) |

---

## Installation

```bash
npm install
```

---

## Intégration par client

### Claude Code
```bash
claude mcp add proxmox -- node /chemin/vers/server.js
# Puis définir les variables d'env dans la config MCP
```

### Cursor / Windsurf
Dans `.cursor/mcp.json` ou `~/.codeium/windsurf/mcp_settings.json` :
```json
{
  "mcpServers": {
    "proxmox": {
      "command": "node",
      "args": ["/chemin/vers/server.js"],
      "env": {
        "PROXMOX_TOKEN_ID": "root@pam!mon-token",
        "PROXMOX_TOKEN_SECRET": "xxxx-xxxx-xxxx"
      }
    }
  }
}
```

### Cline (VS Code)
```json
{
  "proxmox": {
    "command": "node",
    "args": ["/chemin/vers/server.js"],
    "env": {
      "PROXMOX_TOKEN_ID": "root@pam!mon-token",
      "PROXMOX_TOKEN_SECRET": "xxxx-xxxx-xxxx"
    }
  }
}
```

### n8n / Agents distants (mode HTTP)
```bash
PROXMOX_TOKEN_ID="..." PROXMOX_TOKEN_SECRET="..." MCP_HTTP_PORT=3100 node server.js --http
```
Puis dans n8n → MCP Client node → URL : `http://<host>:3100`

### Claude Desktop (.dxt)
Utiliser les fichiers `manifest-manager.json` ou `manifest-admin.json` pour packager en `.dxt`.

---

## Outils disponibles (32)

### Lecture / Monitoring (11)
`pve_cluster_resources` · `pve_node_status` · `pve_vm_status` · `pve_vm_config` · `pve_lxc_status`
`pve_list_snapshots` · `pve_list_tasks` · `pve_task_log` · `pve_storage_content`
`pve_not_backed_up` · `pve_list_backup_jobs`

### VM Lifecycle (6)
`pve_vm_start` · `pve_vm_reboot` · `pve_vm_shutdown` ⚠️ · `pve_vm_stop` ⚠️ · `pve_vm_suspend` · `pve_vm_resume`

### VM Configuration (2)
`pve_vm_set_config` · `pve_vm_resize_disk`

### Snapshots (3)
`pve_snapshot_create` · `pve_snapshot_delete` ⚠️ · `pve_snapshot_rollback` ⚠️

### Backup / Migration / Clone (4)
`pve_backup_vm` · `pve_vm_migrate` · `pve_vm_clone` · `pve_vm_delete` ⚠️

### LXC (3)
`pve_lxc_start` · `pve_lxc_shutdown` ⚠️ · `pve_lxc_stop` ⚠️

> ⚠️ Les opérations destructives exigent `confirmed: true`
