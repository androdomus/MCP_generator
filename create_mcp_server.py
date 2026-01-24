#!/usr/bin/env python3
"""
Script de génération d'un serveur MCP (Model Context Protocol)
Crée une structure de projet complète avec tous les fichiers nécessaires
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Optional

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MCPServerGenerator:
    """Générateur de serveur MCP"""

    def __init__(self, project_name: str, project_path: Optional[str] = None):
        self.project_name = project_name
        self.project_path = Path(project_path or project_name)
        self.project_path.mkdir(parents=True, exist_ok=True)

    def create_main_server(self):
        """Crée le fichier serveur principal"""
        server_content = '''#!/usr/bin/env python3
"""
Serveur MCP (Model Context Protocol) généré automatiquement
"""

import json
import sys
from typing import Any, Optional
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MCPServer:
    """Serveur MCP basique"""

    def __init__(self):
        self.name = "{project_name}"
        self.version = "1.0.0"
        self.tools = {{}}
        self.resources = {{}}

    def register_tool(self, name: str, description: str, callback):
        """Enregistre un outil"""
        self.tools[name] = {{
            "description": description,
            "callback": callback,
            "inputSchema": {{
                "type": "object",
                "properties": {{}},
                "required": []
            }}
        }}
        logger.info(f"Outil enregistré: {{name}}")

    def register_resource(self, name: str, description: str, uri: str):
        """Enregistre une ressource"""
        self.resources[name] = {{
            "description": description,
            "uri": uri
        }}
        logger.info(f"Ressource enregistrée: {{name}}")

    def initialize(self):
        """Initialise le serveur"""
        logger.info(f"Initialisation du serveur {{self.name}} v{{self.version}}")
        return {{
            "protocolVersion": "2024-11-05",
            "capabilities": {{
                "tools": {{}} if self.tools else {{}},
                "resources": {{}} if self.resources else {{}}
            }},
            "serverInfo": {{
                "name": self.name,
                "version": self.version
            }}
        }}

    def handle_message(self, message: dict) -> dict:
        """Traite un message MCP"""
        method = message.get("method")
        params = message.get("params", {{}})

        if method == "initialize":
            return self.initialize()
        elif method == "tools/list":
            return {{"tools": list(self.tools.keys())}}
        elif method == "resources/list":
            return {{"resources": list(self.resources.keys())}}
        else:
            return {{"error": f"Méthode inconnue: {{method}}"}}

    def run(self):
        """Lance le serveur"""
        logger.info("Serveur en écoute...")
        while True:
            try:
                line = input()
                if not line:
                    continue

                message = json.loads(line)
                response = self.handle_message(message)
                print(json.dumps(response))
                sys.stdout.flush()

            except json.JSONDecodeError as e:
                logger.error(f"Erreur JSON: {{e}}")
            except KeyboardInterrupt:
                logger.info("Arrêt du serveur")
                break
            except Exception as e:
                logger.error(f"Erreur: {{e}}")


def main():
    server = MCPServer()

    # Exemple d'outil
    def hello_tool(name: str) -> str:
        return f"Bonjour, {{name}}!"

    server.register_tool(
        "hello",
        "Outil de salutation",
        hello_tool
    )

    # Exemple de ressource
    server.register_resource(
        "config",
        "Configuration du serveur",
        "mcp://config"
    )

    server.run()


if __name__ == "__main__":
    main()
'''.format(project_name=self.project_name)

        server_file = self.project_path / "server.py"
        server_file.write_text(server_content)
        server_file.chmod(0o755)
        logger.info(f"✓ Serveur créé: {server_file}")

    def create_requirements(self):
        """Crée le fichier requirements.txt"""
        requirements_content = """mcp>=0.1.0
pydantic>=2.0.0
python-dotenv>=1.0.0
"""
        req_file = self.project_path / "requirements.txt"
        req_file.write_text(requirements_content)
        logger.info(f"✓ Requirements créé: {req_file}")

    def create_config(self):
        """Crée le fichier de configuration"""
        config_content = {
            "server": {
                "name": self.project_name,
                "version": "1.0.0",
                "description": f"Serveur MCP: {self.project_name}"
            },
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
            "tools": [],
            "resources": []
        }

        config_file = self.project_path / "config.json"
        config_file.write_text(json.dumps(config_content, indent=2))
        logger.info(f"✓ Configuration créée: {config_file}")

    def create_dockerfile(self):
        """Crée un Dockerfile"""
        dockerfile_content = """FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .
COPY config.json .

EXPOSE 5000

CMD ["python", "server.py"]
"""
        dockerfile = self.project_path / "Dockerfile"
        dockerfile.write_text(dockerfile_content)
        logger.info(f"✓ Dockerfile créé: {dockerfile}")

    def create_docker_compose(self):
        """Crée un docker-compose.yml"""
        compose_content = f"""version: '3.8'

services:
  mcp-server:
    build: .
    container_name: {self.project_name}-mcp
    environment:
      - LOG_LEVEL=INFO
    ports:
      - "5000:5000"
    restart: unless-stopped
"""
        compose_file = self.project_path / "docker-compose.yml"
        compose_file.write_text(compose_content)
        logger.info(f"✓ Docker Compose créé: {compose_file}")

    def create_example_tools(self):
        """Crée un fichier d'outils d'exemple"""
        tools_content = '''"""
Outils exemple pour le serveur MCP
"""

from typing import Any, Dict


class ExampleTools:
    """Ensemble d'outils d'exemple"""

    @staticmethod
    def echo(message: str) -> str:
        """Répète le message reçu"""
        return f"Echo: {message}"

    @staticmethod
    def add(a: float, b: float) -> float:
        """Additionne deux nombres"""
        return a + b

    @staticmethod
    def get_info() -> Dict[str, Any]:
        """Retourne les informations du serveur"""
        return {
            "status": "running",
            "tools_available": ["echo", "add", "get_info"]
        }

    @staticmethod
    def process_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Traite des données JSON"""
        return {
            "received": data,
            "keys": list(data.keys()) if isinstance(data, dict) else []
        }
'''
        tools_file = self.project_path / "tools.py"
        tools_file.write_text(tools_content)
        logger.info(f"✓ Outils d'exemple créés: {tools_file}")

    def create_readme(self):
        """Crée un README.md"""
        readme_content = f"""# Serveur MCP: {self.project_name}

Serveur Model Context Protocol généré automatiquement.

## Installation

### Installation locale
```bash
pip install -r requirements.txt
python server.py
```

### Avec Docker
```bash
docker build -t {self.project_name}-mcp .
docker run -p 5000:5000 {self.project_name}-mcp
```

### Avec Docker Compose
```bash
docker-compose up -d
```

## Configuration

Modifiez `config.json` pour configurer le serveur:
- Ajouter des outils
- Configurer les ressources
- Ajuster les paramètres de logging

## Ajouter des outils

Enregistrez de nouveaux outils dans `server.py`:

```python
def my_tool(param: str) -> str:
    return f"Résultat: {{param}}"

server.register_tool(
    "my_tool",
    "Description de mon outil",
    my_tool
)
```

## Structure du projet

```
{self.project_name}/
├── server.py           # Serveur principal
├── config.json         # Configuration
├── requirements.txt    # Dépendances
├── tools.py           # Outils d'exemple
├── Dockerfile         # Configuration Docker
├── docker-compose.yml # Composition Docker
└── README.md          # Ce fichier
```

## Protocole MCP

Le serveur implémente le Model Context Protocol (MCP).

### Messages supportés

- `initialize` - Initialise le serveur
- `tools/list` - Liste les outils disponibles
- `resources/list` - Liste les ressources disponibles

## Développement

Pour développer localement:

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # ou venv\\Scripts\\activate sur Windows

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
python server.py
```

## Logs

Les logs sont affichés dans la console. Modifiez le niveau dans `config.json`.

## Support

Pour plus d'informations sur MCP, consultez la documentation officielle.
"""
        readme_file = self.project_path / "README.md"
        readme_file.write_text(readme_content)
        logger.info(f"✓ README créé: {readme_file}")

    def create_gitignore(self):
        """Crée un .gitignore"""
        gitignore_content = """# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
ENV/
env/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Environment variables
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Docker
.dockerignore

# Project specific
logs/
data/
*.log
"""
        gitignore_file = self.project_path / ".gitignore"
        gitignore_file.write_text(gitignore_content)
        logger.info(f"✓ .gitignore créé: {gitignore_file}")

    def create_all(self):
        """Crée tous les fichiers du projet"""
        logger.info(f"\n📦 Création du serveur MCP: {self.project_name}")
        logger.info(f"📁 Chemin: {self.project_path.absolute()}\n")

        self.create_main_server()
        self.create_requirements()
        self.create_config()
        self.create_dockerfile()
        self.create_docker_compose()
        self.create_example_tools()
        self.create_readme()
        self.create_gitignore()

        logger.info(f"\n✅ Serveur MCP créé avec succès!")
        logger.info(f"\n📋 Prochaines étapes:")
        logger.info(f"  1. cd {self.project_path}")
        logger.info(f"  2. pip install -r requirements.txt")
        logger.info(f"  3. python server.py")
        logger.info(f"\n🐳 Ou avec Docker:")
        logger.info(f"  docker-compose up -d")


def main():
    parser = argparse.ArgumentParser(
        description="Générateur de serveur MCP"
    )
    parser.add_argument(
        "name",
        help="Nom du projet serveur MCP"
    )
    parser.add_argument(
        "-p", "--path",
        help="Chemin du projet (par défaut: nom du projet)",
        default=None
    )

    args = parser.parse_args()

    generator = MCPServerGenerator(args.name, args.path)
    generator.create_all()


if __name__ == "__main__":
    main()
