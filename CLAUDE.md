# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Aperçu

Ce dépôt contient des générateurs Python pour créer des serveurs MCP (Model Context Protocol). Il y a trois scripts principaux qui génèrent automatiquement la structure complète d'un projet serveur MCP.

## Commandes essentielles

### Lancer le mode interactif (recommandé pour les utilisateurs)
```bash
python launch_mcp.py
```

### Générer un serveur MCP standard
```bash
python create_mcp_server.py <nom_projet> [-p <chemin_optionnel>]
```

### Générer un serveur MCP optimisé pour n8n
```bash
python create_mcp_server_n8n.py <nom_projet> [-p <chemin_optionnel>]
```

### Tester les générateurs
```bash
# Créer un serveur de test
python create_mcp_server.py test-server
cd test-server
pip install -r requirements.txt
python server.py
```

## Architecture

### Structure des générateurs

Les trois scripts suivent une architecture orientée objet similaire :

- **`launch_mcp.py`** : Interface utilisateur interactive avec menu pour guider l'utilisateur dans la création de serveurs. Orchestre l'appel aux autres générateurs.

- **`create_mcp_server.py`** : Générateur de serveurs MCP standard
  - Classe `MCPServerGenerator` : Gère la création de tous les fichiers
  - Méthodes de création : `create_main_server()`, `create_requirements()`, `create_config()`, etc.
  - Génère : server.py, config.json, tools.py, Dockerfile, docker-compose.yml, README.md, .gitignore

- **`create_mcp_server_n8n.py`** : Générateur spécialisé pour intégration n8n
  - Classe `N8NMCPServerGenerator` : Version optimisée pour workflows n8n
  - Outils pré-configurés : create_notion_task, send_telegram_message, log_habit, process_telegram_command
  - Génère : server_n8n.py, config_n8n.json, Dockerfile.n8n, docker-compose.n8n.yml, INTEGRATION_N8N.md

### Architecture MCP générée

Les serveurs générés implémentent le protocole MCP v2024-11-05 :

```
Client MCP (Claude, n8n, etc.)
         ↓
    [Serveur MCP]
    - initialize() : Initialise et retourne les capacités
    - handle_message() : Traite les messages JSON-RPC
    - register_tool() : Enregistre de nouveaux outils
    - register_resource() : Enregistre des ressources
         ↓
    Outils personnalisés (callbacks Python)
```

**Méthodes MCP supportées :**
- `initialize` : Initialisation du serveur avec capabilities
- `tools/list` : Liste des outils disponibles avec leurs schémas
- `tools/call` : Invocation d'un outil avec arguments validés
- `resources/list` : Liste des ressources disponibles

### Communication

Les serveurs générés communiquent via stdin/stdout en JSON-RPC :
- Lecture : `sys.stdin.readline()` ou `input()`
- Écriture : `print(json.dumps(response))` + `sys.stdout.flush()`
- Format : JSON-RPC 2.0 avec `{"jsonrpc": "2.0", "id": ..., "method": ..., "params": ...}`

## Patterns de code importants

### Enregistrement d'outils dans les serveurs générés

Les outils sont enregistrés avec un schéma JSON obligatoire :
```python
server.register_tool(
    "nom_outil",
    "Description de l'outil",
    {
        "type": "object",
        "properties": {
            "param": {"type": "string", "description": "..."}
        },
        "required": ["param"]
    },
    callback_function
)
```

### Structure des générateurs

Tous les générateurs suivent ce pattern :
1. Initialisation avec nom et chemin du projet
2. Création du répertoire projet avec `Path().mkdir(parents=True, exist_ok=True)`
3. Génération de chaque fichier via des méthodes dédiées (`create_*()`)
4. Écriture avec `file.write_text(content)` et `file.chmod(0o755)` pour les scripts
5. Méthode `create_all()` qui orchestre toutes les créations

### Gestion des templates

Les contenus de fichiers sont définis comme des chaînes multi-lignes (triple quotes) avec formatage :
```python
content = '''#!/usr/bin/env python3
...
name = "{project_name}"
...
'''.format(project_name=self.project_name)
```

## Modification des générateurs

### Ajouter un nouveau type de serveur

1. Créer un nouveau fichier `create_mcp_server_<type>.py`
2. Implémenter une classe `<Type>MCPServerGenerator` avec :
   - `__init__(self, name, path=None)`
   - Méthodes `create_*()` pour chaque fichier
   - Méthode `create_all()` qui orchestre
3. Ajouter une option dans `launch_mcp.py` menu et fonction `create_<type>_mcp()`

### Ajouter des outils par défaut

Dans les méthodes qui génèrent le serveur (ex: `setup_n8n_tools()` dans create_mcp_server_n8n.py), ajouter :
```python
server.register_tool(
    "nouveau_outil",
    "Description",
    schema_json,
    lambda param: {"result": "..."}
)
```

### Modifier les dépendances générées

Dans `create_requirements()` ou équivalent, modifier le contenu du fichier requirements.txt.

## Conventions

- Les scripts générateurs utilisent `argparse` pour les arguments CLI
- Logging avec `logging.basicConfig(level=logging.INFO)` et `logger = logging.getLogger(__name__)`
- Les serveurs générés utilisent `pathlib.Path` pour la manipulation de fichiers
- Permissions exécutables avec `chmod(0o755)` pour les fichiers .py générés
- Format JSON avec indentation 2 pour la lisibilité : `json.dumps(data, indent=2)`
- Les serveurs MCP générés doivent gérer KeyboardInterrupt proprement
