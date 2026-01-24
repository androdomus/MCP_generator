# 🚀 Générateurs de Serveur MCP

Suite complète de scripts Python pour générer et déployer des serveurs Model Context Protocol (MCP).

## 📦 Contenu

- `launch_mcp.py` - **Lanceur interactif** (RECOMMANDÉ pour commencer)
- `create_mcp_server.py` - Générateur de serveur MCP standard
- `create_mcp_server_n8n.py` - Générateur spécialisé pour n8n

## 🚀 Démarrage rapide

### Mode interactif (Recommandé)

```bash
python launch_mcp.py
```

Puis suivez le menu pour créer votre serveur.

### Mode ligne de commande

**Serveur standard:**
```bash
python create_mcp_server.py mon-serveur
```

**Serveur n8n:**
```bash
python create_mcp_server_n8n.py mon-serveur-n8n
```

## 📋 Options

### `launch_mcp.py`

```bash
python launch_mcp.py                  # Mode interactif
python launch_mcp.py --quick-start    # Affiche le guide
python launch_mcp.py --help           # Affiche l'aide
```

### `create_mcp_server.py`

```bash
python create_mcp_server.py <name> [-p <path>]

Arguments:
  <name>           Nom du projet (obligatoire)
  -p, --path       Chemin du projet (optionnel)

Exemples:
  python create_mcp_server.py mon-serveur
  python create_mcp_server.py mon-serveur -p /chemin/custom
```

### `create_mcp_server_n8n.py`

```bash
python create_mcp_server_n8n.py <name> [-p <path>]

Arguments:
  <name>           Nom du projet (obligatoire)
  -p, --path       Chemin du projet (optionnel)

Exemples:
  python create_mcp_server_n8n.py notion-telegram
  python create_mcp_server_n8n.py automation -p ~/projects/
```

## 📂 Structure générée

### Serveur standard

```
mon-serveur/
├── server.py              # Serveur principal
├── config.json            # Configuration JSON
├── tools.py              # Outils d'exemple
├── requirements.txt      # Dépendances Python
├── Dockerfile            # Image Docker
├── docker-compose.yml    # Composition Docker
├── .gitignore            # Fichiers à ignorer
└── README.md             # Documentation
```

### Serveur n8n

```
mon-serveur-n8n/
├── server_n8n.py         # Serveur optimisé n8n
├── config_n8n.json       # Config n8n
├── requirements.txt      # Dépendances
├── Dockerfile.n8n        # Dockerfile
├── docker-compose.n8n.yml # Compose avec n8n
└── INTEGRATION_N8N.md    # Guide d'intégration
```

## 💻 Utilisation

### Démarrer un serveur créé

**Localement:**
```bash
cd mon-serveur
pip install -r requirements.txt
python server.py
```

**Avec Docker:**
```bash
cd mon-serveur
docker build -t mon-serveur .
docker run -p 5000:5000 mon-serveur
```

**Avec Docker Compose:**
```bash
cd mon-serveur
docker-compose up -d
```

### Avec n8n

```bash
cd mon-serveur-n8n
docker-compose -f docker-compose.n8n.yml up -d
```

Puis accédez à http://localhost:5678

## 🛠 Ajouter des outils personnalisés

### Méthode 1: Modifier `server.py`

```python
def mon_outil(param1: str, param2: int) -> dict:
    """Fonction d'outil personnalisée"""
    return {
        "resultat": f"{param1}: {param2}",
        "statut": "succès"
    }

server.register_tool(
    "mon_outil",
    "Description de mon outil",
    mon_outil
)
```

### Méthode 2: Utiliser `tools.py` (Recommandé)

```python
# Dans tools.py
class MesOutils:
    @staticmethod
    def traiter_donnees(data: dict) -> dict:
        return {"resultat": data}
```

Puis importer et enregistrer dans `server.py`:

```python
from tools import MesOutils

server.register_tool(
    "traiter_donnees",
    "Traite les données",
    MesOutils.traiter_donnees
)
```

## 🔗 Intégration n8n

### Configuration simple

1. **Créer le serveur MCP:**
```bash
python create_mcp_server_n8n.py mon-bot
cd mon-bot
docker-compose -f docker-compose.n8n.yml up -d
```

2. **Dans n8n:**
   - Créer un nouveau workflow
   - Ajouter un nœud "HTTP Request"
   - Configurer:
     ```
     URL: http://localhost:5000/tools/call
     Method: POST
     Body: {
       "name": "create_notion_task",
       "arguments": {...}
     }
     ```

3. **Outils disponibles:**
   - `create_notion_task` - Crée une tâche Notion
   - `send_telegram_message` - Envoie un message Telegram
   - `log_habit` - Enregistre une habitude
   - `process_telegram_command` - Traite une commande

### Exemple de workflow

```
Webhook Telegram
      ↓
n8n (Process command)
      ↓
HTTP Request → Serveur MCP
      ↓
Créer tâche Notion
      ↓
Répondre sur Telegram
```

## 📊 Architecture MCP

Le serveur implémente le protocol MCP v2024-11-05:

```
Client MCP (Claude, etc.)
         ↓
    [Serveur MCP]
    - Initialize
    - List tools
    - Call tools
         ↓
    Outils personnalisés
```

### Méthodes supportées

```json
{
  "initialize": "Initialise le serveur",
  "tools/list": "Liste les outils disponibles",
  "tools/call": "Appelle un outil avec arguments",
  "resources/list": "Liste les ressources"
}
```

## 🔒 Sécurité

### Bonnes pratiques

1. **Authentification:**
   - Ajouter une clé API dans `config.json`
   - Vérifier les credentials dans les outils

2. **Validation:**
   - Utiliser les schemas JSON
   - Valider les entrées

3. **Environnement:**
   - Utiliser `.env` pour les secrets
   - Ne pas commiter les credentials

### Exemple d'authentification

```python
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("MCP_API_KEY")

def verify_auth(request):
    token = request.headers.get("Authorization")
    return token == f"Bearer {API_KEY}"
```

## 📦 Dépendances

### Standard
- `mcp>=0.1.0`
- `pydantic>=2.0.0`
- `python-dotenv>=1.0.0`

### n8n
- `python-json-rpc>=1.13.0`
- `python-dotenv>=1.0.0`

### Installation
```bash
pip install -r requirements.txt
```

## 🐳 Docker

### Build personnalisé
```bash
docker build -t mon-serveur:latest .
```

### Configuration
Modifiez `Dockerfile` pour:
- Changer la version Python
- Ajouter des dépendances système
- Configurer les volumes

### Multi-stage builds
```dockerfile
FROM python:3.11 as builder
# Build stage

FROM python:3.11-slim
# Runtime stage
```

## 📈 Performance

### Optimisations recommandées

1. **Caching:**
   - Redis pour les résultats
   - Memoization pour les outils

2. **Async:**
   - Utiliser `asyncio` pour les outils lents
   - Configurer les timeouts

3. **Logging:**
   - Activer seulement en développement
   - Utiliser les niveaux appropriés

## 🐛 Debugging

### Logs détaillés
```bash
export LOG_LEVEL=DEBUG
python server.py
```

### Tester manuellement
```bash
# Terminal 1
python server.py

# Terminal 2
echo '{"method": "initialize"}' | python -m json.tool
```

## 📚 Ressources

- [Documentation MCP officielle](https://modelcontextprotocol.io)
- [Exemples de serveurs](https://github.com/modelcontextprotocol/servers)
- [Spécification du protocol](https://spec.modelcontextprotocol.io)

## 🤝 Contribution

Pour améliorer les générateurs:
1. Forker le projet
2. Créer une branche
3. Tester les modifications
4. Soumettre une PR

## 📝 Licences

Ces scripts sont fournis à titre d'exemple. Vérifiez les licences des dépendances.

## ❓ FAQ

**Q: Comment ajouter une base de données?**
A: Modifiez les requirements.txt et ajoutez SQLAlchemy ou autre ORM.

**Q: Puis-je utiliser avec Claude?**
A: Oui! Configurez le serveur MCP dans Claude.ai.

**Q: Comment déployer en production?**
A: Utilisez Kubernetes, Docker Swarm, ou un cloud provider.

**Q: Puis-je avoir plusieurs serveurs?**
A: Oui, lancez plusieurs instances sur des ports différents.

**Q: Comment sécuriser le serveur?**
A: Utilisez HTTPS, authentification, et limitez l'accès réseau.

## 📞 Support

Pour les problèmes:
1. Consultez le README du projet créé
2. Vérifiez les logs (`docker logs <container>`)
3. Consultez la documentation MCP
4. Vérifiez les issues GitHub

## 🎉 Exemples

### Serveur de calcul
```python
def calculer(operation: str, a: float, b: float) -> float:
    ops = {"+": a + b, "-": a - b, "*": a * b, "/": a / b}
    return ops.get(operation, 0)

server.register_tool("calculer", "Calcule", calculer)
```

### Serveur de texte
```python
def analyser_text(texte: str) -> dict:
    return {
        "longueur": len(texte),
        "mots": len(texte.split()),
        "majuscule": texte.upper()
    }

server.register_tool("analyser_text", "Analyse du texte", analyser_text)
```

### Serveur avec API externe
```python
import requests

def meteo(ville: str) -> dict:
    resp = requests.get(f"https://api.example.com/weather/{ville}")
    return resp.json()

server.register_tool("meteo", "Météo", meteo)
```

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2024  
**Auteur:** Générateur MCP automatisé
