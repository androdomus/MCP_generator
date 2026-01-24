#!/usr/bin/env python3
"""
Générateur de serveur MCP avec support n8n
Version simplifiée pour intégration Notion + Telegram + n8n
"""

import json
import argparse
from pathlib import Path
from typing import Optional


class N8NMCPServerGenerator:
    """Générateur MCP optimisé pour n8n"""

    def __init__(self, name: str, path: Optional[str] = None):
        self.name = name
        self.path = Path(path or name)
        self.path.mkdir(parents=True, exist_ok=True)

    def create_n8n_server(self):
        """Crée un serveur MCP optimisé pour n8n"""
        content = '''#!/usr/bin/env python3
"""
Serveur MCP pour intégration n8n
Support des workflows Notion, Telegram, et automation
"""

import json
import sys
import logging
from typing import Any, Dict, Optional
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class N8NMCPServer:
    """Serveur MCP pour n8n"""

    def __init__(self, name: str = "{project_name}"):
        self.name = name
        self.version = "1.0.0"
        self.tools = {{}}
        self.context = {{}

    def register_tool(self, name: str, description: str, 
                     input_schema: Dict[str, Any], callback=None):
        """Enregistre un outil avec schéma JSON"""
        self.tools[name] = {{
            "description": description,
            "inputSchema": input_schema,
            "callback": callback
        }}
        logger.info(f"✓ Outil enregistré: {{name}}")

    def initialize(self) -> Dict[str, Any]:
        """Initialisation MCP"""
        return {{
            "protocolVersion": "2024-11-05",
            "capabilities": {{
                "tools": {{}},
                "resources": {{}},
                "prompts": {{}}
            }},
            "serverInfo": {{
                "name": self.name,
                "version": self.version,
                "description": "Serveur MCP pour n8n workflows"
            }}
        }}

    def list_tools(self) -> Dict[str, Any]:
        """Liste les outils disponibles"""
        tools_list = []
        for name, tool_info in self.tools.items():
            tools_list.append({{
                "name": name,
                "description": tool_info["description"],
                "inputSchema": tool_info["inputSchema"]
            }})
        return {{"tools": tools_list}}

    def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Appelle un outil"""
        if name not in self.tools:
            return {{"error": f"Outil inconnu: {{name}}"}}

        tool = self.tools[name]
        if tool["callback"]:
            try:
                result = tool["callback"](**arguments)
                return {{"result": result}}
            except Exception as e:
                logger.error(f"Erreur lors de l'appel {{name}}: {{e}}")
                return {{"error": str(e)}}

        return {{"result": "Outil enregistré mais non implémenté"}}

    def handle_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Traite un message MCP"""
        method = message.get("method")
        params = message.get("params", {{}})
        id_ = message.get("id")

        response = {{"jsonrpc": "2.0"}}
        if id_ is not None:
            response["id"] = id_

        try:
            if method == "initialize":
                response["result"] = self.initialize()
            elif method == "tools/list":
                response["result"] = self.list_tools()
            elif method == "tools/call":
                tool_name = params.get("name")
                arguments = params.get("arguments", {{}})
                response["result"] = self.call_tool(tool_name, arguments)
            else:
                response["error"] = {{
                    "code": -32601,
                    "message": f"Méthode non reconnue: {{method}}"
                }}
        except Exception as e:
            logger.error(f"Erreur: {{e}}")
            response["error"] = {{
                "code": -32603,
                "message": str(e)
            }}

        return response

    def run(self):
        """Lance le serveur"""
        logger.info(f"Serveur {{self.name}} démarré")
        logger.info("En attente de connexions MCP...")

        while True:
            try:
                line = sys.stdin.readline()
                if not line:
                    break

                message = json.loads(line)
                response = self.handle_message(message)
                print(json.dumps(response))
                sys.stdout.flush()

            except json.JSONDecodeError as e:
                logger.error(f"Erreur JSON: {{e}}")
            except KeyboardInterrupt:
                logger.info("Serveur arrêté")
                break
            except Exception as e:
                logger.error(f"Erreur: {{e}}")


def setup_n8n_tools(server: N8NMCPServer):
    """Configure les outils spécifiques n8n"""

    # Outil: Créer une tâche Notion
    server.register_tool(
        "create_notion_task",
        "Crée une tâche dans Notion",
        {{
            "type": "object",
            "properties": {{
                "title": {{"type": "string", "description": "Titre de la tâche"}},
                "description": {{"type": "string", "description": "Description"}},
                "priority": {{
                    "type": "string",
                    "enum": ["low", "medium", "high"],
                    "description": "Priorité"
                }},
                "due_date": {{"type": "string", "format": "date", "description": "Date limite"}}
            }},
            "required": ["title"]
        }},
        lambda title, description="", priority="medium", due_date=None: {{
            "status": "created",
            "task": {{
                "title": title,
                "description": description,
                "priority": priority,
                "due_date": due_date,
                "created_at": datetime.now().isoformat()
            }}
        }}
    )

    # Outil: Envoyer un message Telegram
    server.register_tool(
        "send_telegram_message",
        "Envoie un message Telegram",
        {{
            "type": "object",
            "properties": {{
                "chat_id": {{"type": "string", "description": "ID du chat"}},
                "message": {{"type": "string", "description": "Message à envoyer"}},
                "parse_mode": {{
                    "type": "string",
                    "enum": ["HTML", "Markdown", "MarkdownV2"],
                    "description": "Format du message"
                }}
            }},
            "required": ["chat_id", "message"]
        }},
        lambda chat_id, message, parse_mode="HTML": {{
            "status": "sent",
            "message_id": "mock_id",
            "chat_id": chat_id
        }}
    )

    # Outil: Logger une habitude
    server.register_tool(
        "log_habit",
        "Enregistre une habitude complétée",
        {{
            "type": "object",
            "properties": {{
                "habit_name": {{"type": "string", "description": "Nom de l'habitude"}},
                "date": {{"type": "string", "format": "date", "description": "Date"}},
                "notes": {{"type": "string", "description": "Notes optionnelles"}}
            }},
            "required": ["habit_name"]
        }},
        lambda habit_name, date=None, notes="": {{
            "status": "logged",
            "habit": habit_name,
            "timestamp": datetime.now().isoformat()
        }}
    )

    # Outil: Traiter un commandment Telegram
    server.register_tool(
        "process_telegram_command",
        "Traite une commande Telegram",
        {{
            "type": "object",
            "properties": {{
                "command": {{"type": "string", "description": "Commande à traiter"}},
                "args": {{
                    "type": "array",
                    "items": {{"type": "string"}},
                    "description": "Arguments"
                }}
            }},
            "required": ["command"]
        }},
        lambda command, args=[]: {{
            "command": command,
            "args": args,
            "processed": True,
            "timestamp": datetime.now().isoformat()
        }}
    )

    logger.info("✓ Outils n8n configurés")


def main():
    parser = argparse.ArgumentParser(description="Générateur MCP pour n8n")
    parser.add_argument("name", help="Nom du serveur")
    parser.add_argument("-p", "--path", help="Chemin du projet")

    args = parser.parse_args()

    server = N8NMCPServer(args.name)
    setup_n8n_tools(server)

    try:
        server.run()
    except KeyboardInterrupt:
        logger.info("Serveur arrêté par l'utilisateur")


if __name__ == "__main__":
    main()
'''.format(project_name=self.name)

        server_file = self.path / "server_n8n.py"
        server_file.write_text(content)
        server_file.chmod(0o755)
        print(f"✓ Serveur n8n créé: {server_file}")

    def create_n8n_config(self):
        """Crée la configuration n8n"""
        config = {
            "serverInfo": {
                "name": self.name,
                "version": "1.0.0"
            },
            "tools": [
                {
                    "name": "create_notion_task",
                    "description": "Crée une tâche Notion"
                },
                {
                    "name": "send_telegram_message",
                    "description": "Envoie un message Telegram"
                },
                {
                    "name": "log_habit",
                    "description": "Enregistre une habitude"
                },
                {
                    "name": "process_telegram_command",
                    "description": "Traite une commande Telegram"
                }
            ],
            "integrations": [
                {
                    "name": "notion",
                    "enabled": True,
                    "endpoints": ["/notion"]
                },
                {
                    "name": "telegram",
                    "enabled": True,
                    "endpoints": ["/telegram"]
                },
                {
                    "name": "n8n",
                    "enabled": True,
                    "endpoints": ["/webhook"]
                }
            ]
        }

        config_file = self.path / "config_n8n.json"
        config_file.write_text(json.dumps(config, indent=2))
        print(f"✓ Configuration n8n créée: {config_file}")

    def create_integration_example(self):
        """Crée un exemple d'intégration"""
        example = '''# Exemple d'intégration n8n + MCP

## Configuration n8n

Dans n8n, créez un workflow avec:

### 1. HTTP Request vers le serveur MCP
```
POST http://localhost:5000/tools/call
Body: {
  "name": "create_notion_task",
  "arguments": {
    "title": "Ma nouvelle tâche",
    "priority": "high"
  }
}
```

### 2. Webhook Telegram
Configure un webhook pour recevoir les commandes Telegram

### 3. Appel au serveur MCP
Le serveur traite et répond avec le résultat

## Workflow Notion + Telegram + n8n

1. Message Telegram → n8n webhook
2. n8n traite la commande
3. n8n appelle le serveur MCP
4. Serveur crée une tâche Notion
5. Confirmation envoyée à Telegram

## Docker Compose pour l'intégration

```yaml
version: '3.8'

services:
  mcp-server:
    build: .
    container_name: {name}-mcp
    ports:
      - "5000:5000"
    environment:
      - LOG_LEVEL=INFO
    restart: unless-stopped

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n
      - N8N_PORT=5678
      - WEBHOOK_URL=http://n8n:5678/
    depends_on:
      - mcp-server
    restart: unless-stopped
```

## Lancement

```bash
docker-compose up -d
```

Accédez à:
- n8n: http://localhost:5678
- Serveur MCP: http://localhost:5000
'''
        example_file = self.path / "INTEGRATION_N8N.md"
        example_file.write_text(example.format(name=self.name))
        print(f"✓ Exemple d'intégration créé: {example_file}")

    def create_docker_compose_n8n(self):
        """Crée docker-compose avec n8n"""
        compose = f'''version: '3.8'

services:
  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile.n8n
    container_name: {self.name}-mcp
    ports:
      - "5000:5000"
    environment:
      - LOG_LEVEL=INFO
      - PYTHONUNBUFFERED=1
    restart: unless-stopped
    networks:
      - mcp-network

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - WEBHOOK_URL=http://localhost:5678/
    depends_on:
      - mcp-server
    restart: unless-stopped
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
'''
        compose_file = self.path / "docker-compose.n8n.yml"
        compose_file.write_text(compose)
        print(f"✓ Docker Compose n8n créé: {compose_file}")

    def create_dockerfile_n8n(self):
        """Crée Dockerfile pour n8n"""
        dockerfile = '''FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server_n8n.py .
COPY config_n8n.json .

EXPOSE 5000

CMD ["python", "server_n8n.py", "mcp-server"]
'''
        dockerfile_file = self.path / "Dockerfile.n8n"
        dockerfile_file.write_text(dockerfile)
        print(f"✓ Dockerfile n8n créé: {dockerfile_file}")

    def create_all(self):
        """Crée tous les fichiers n8n"""
        print(f"\n📦 Création du serveur MCP pour n8n: {self.name}")
        print(f"📁 Chemin: {self.path.absolute()}\n")

        self.create_n8n_server()
        self.create_n8n_config()
        self.create_dockerfile_n8n()
        self.create_docker_compose_n8n()
        self.create_integration_example()

        self.path.joinpath("requirements.txt").write_text(
            "python-json-rpc>=1.13.0\npython-dotenv>=1.0.0\n"
        )

        print(f"\n✅ Serveur MCP pour n8n créé!")
        print(f"\n📋 Prochaines étapes:")
        print(f"  cd {self.path}")
        print(f"  docker-compose -f docker-compose.n8n.yml up -d")
        print(f"\nConsultez INTEGRATION_N8N.md pour l'intégration détaillée")


def main():
    parser = argparse.ArgumentParser(description="Générateur MCP pour n8n")
    parser.add_argument("name", help="Nom du projet")
    parser.add_argument("-p", "--path", help="Chemin du projet")

    args = parser.parse_args()

    generator = N8NMCPServerGenerator(args.name, args.path)
    generator.create_all()


if __name__ == "__main__":
    main()
