# jpi-mcp

Serveur MCP pour contrôler un téléphone Android via l'API **JPI (JSON Phone Interface)**.

## Variables d'environnement

| Variable | Requis | Défaut | Description |
|----------|--------|--------|-------------|
| `JPI_HOST` | ✅ | `192.168.1.118` | IP du téléphone Android |
| `JPI_PORT` | ❌ | `8081` | Port de l'app JPI |
| `LAURENT_PHONE` | ✅ | `0778817834` | Numéro destinataire par défaut |

## Prérequis

- App **JPI** active sur le téléphone Android
- Téléphone sur le même réseau local (ou accessible via VPN/Tailscale)

## Installation

```bash
npm install
```

## Outils (8)

| Outil | Description |
|-------|-------------|
| `jpi_device_info` | Infos appareil + vérification JPI actif |
| `jpi_send_sms` | Envoyer un SMS |
| `jpi_make_call` | Appel téléphonique ⚠️ confirmed |
| `jpi_show_toast` | Notification toast écran |
| `jpi_text_to_speech` | TTS — faire parler le téléphone |
| `jpi_take_picture` | Prendre une photo |
| `jpi_set_variable` | Écrire variable persistante JPI |
| `jpi_get_variable` | Lire variable JPI |
