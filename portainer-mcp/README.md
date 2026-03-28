# portainer-mcp

Serveur MCP pour gérer l'infrastructure Docker via **Portainer**.

## Variables d'environnement

| Variable | Requis | Défaut | Description |
|----------|--------|--------|-------------|
| `PORTAINER_URL` | ✅ | `https://192.168.1.26:9443` | URL Portainer |
| `PORTAINER_API_KEY` | ✅ | — | Token API (Settings → Users → API key) |
| `PORTAINER_ENDPOINT` | ❌ | `2` | ID de l'environnement Docker |

## Installation

```bash
npm install
```

## Outils (14)

### Système
`portainer_status` · `portainer_endpoints`

### Containers
`portainer_list_containers` · `portainer_inspect_container` · `portainer_container_logs`
`portainer_restart_container` ⚠️ · `portainer_start_container` · `portainer_stop_container` ⚠️

### Stacks
`portainer_list_stacks` · `portainer_stack_containers`

### Infrastructure
`portainer_list_images` · `portainer_list_networks` · `portainer_list_volumes` · `portainer_docker_info`

> ⚠️ restart, stop exigent `confirmed: true`
