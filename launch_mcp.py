#!/usr/bin/env python3
"""
Lanceur interactif pour la création de serveurs MCP
Simplifie le processus de génération
"""

import os
import sys
import subprocess
from pathlib import Path


def print_banner():
    """Affiche le banner"""
    banner = """
╔═══════════════════════════════════════════════════════════════╗
║          🚀 GÉNÉRATEUR DE SERVEUR MCP                         ║
║                                                               ║
║  Créez rapidement un serveur Model Context Protocol (MCP)     ║
╚═══════════════════════════════════════════════════════════════╝
"""
    print(banner)


def print_menu():
    """Affiche le menu"""
    menu = """
Choisissez le type de serveur MCP à créer:

1️⃣  Serveur MCP standard
    - Structure complète avec Docker
    - Outils d'exemple inclus
    - Prêt pour la production

2️⃣  Serveur MCP pour n8n
    - Intégration optimisée n8n
    - Support Notion, Telegram
    - Parfait pour vos workflows

3️⃣  Mode personnalisé
    - Configuration avancée
    - Options supplémentaires

0️⃣  Quitter

"""
    print(menu)


def create_standard_mcp():
    """Crée un serveur MCP standard"""
    print("\n📋 Création du serveur MCP standard")
    print("=" * 50)

    name = input("\nNom du projet (ex: mon-serveur-mcp): ").strip()
    if not name:
        print("❌ Nom vide, annulation")
        return

    path = input("Chemin (appuyez sur Entrée pour utiliser le nom): ").strip()

    cmd = ["python", "create_mcp_server.py", name]
    if path:
        cmd.extend(["-p", path])

    try:
        subprocess.run(cmd, check=True)
        print("\n✅ Serveur créé avec succès!")
        
        if not path:
            path = name
        
        print(f"\n📝 Pour démarrer:")
        print(f"   cd {path}")
        print(f"   python server.py")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur: {e}")


def create_n8n_mcp():
    """Crée un serveur MCP pour n8n"""
    print("\n🔗 Création du serveur MCP pour n8n")
    print("=" * 50)

    name = input("\nNom du projet (ex: notion-telegram-bot): ").strip()
    if not name:
        print("❌ Nom vide, annulation")
        return

    path = input("Chemin (appuyez sur Entrée pour utiliser le nom): ").strip()

    cmd = ["python", "create_mcp_server_n8n.py", name]
    if path:
        cmd.extend(["-p", path])

    try:
        subprocess.run(cmd, check=True)
        print("\n✅ Serveur n8n créé avec succès!")
        
        if not path:
            path = name
        
        print(f"\n📝 Pour démarrer:")
        print(f"   cd {path}")
        print(f"   docker-compose -f docker-compose.n8n.yml up -d")
        print(f"\n📖 Consultez INTEGRATION_N8N.md pour l'intégration")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur: {e}")


def create_custom_mcp():
    """Mode personnalisé"""
    print("\n⚙️  Mode personnalisé")
    print("=" * 50)

    print("\nOptions disponibles:")
    print("1. Ajouter FastAPI")
    print("2. Ajouter support WebSocket")
    print("3. Ajouter authentification")
    print("4. Ajouter base de données")
    print("5. Mode complet (tous les éléments)")

    choice = input("\nChoisissez (1-5): ").strip()

    name = input("\nNom du projet: ").strip()
    if not name:
        print("❌ Nom vide")
        return

    options = {
        "1": ["--fastapi"],
        "2": ["--websocket"],
        "3": ["--auth"],
        "4": ["--database"],
        "5": ["--full"]
    }

    selected_opts = options.get(choice, [])

    print(f"\n✅ Création avec options: {selected_opts}")
    print("(Feature à implémenter)")


def show_quick_start():
    """Affiche un guide de démarrage rapide"""
    guide = """
╔════════════════════════════════════════════════════════════════╗
║            📚 GUIDE DE DÉMARRAGE RAPIDE                        ║
╚════════════════════════════════════════════════════════════════╝

🎯 SERVEUR STANDARD

1. Créer le serveur:
   python create_mcp_server.py my-server

2. Installer et lancer:
   cd my-server
   pip install -r requirements.txt
   python server.py

3. Ou avec Docker:
   docker-compose up -d


🔗 SERVEUR N8N

1. Créer le serveur:
   python create_mcp_server_n8n.py my-n8n-server

2. Lancer avec n8n:
   cd my-n8n-server
   docker-compose -f docker-compose.n8n.yml up -d

3. Accéder à:
   - Serveur MCP: http://localhost:5000
   - n8n: http://localhost:5678


📖 AJOUTER UN NOUVEL OUTIL

Dans server.py:

```python
def my_tool(param1: str, param2: int) -> dict:
    return {"result": f"{param1}: {param2}"}

server.register_tool(
    "my_tool",
    "Description de mon outil",
    my_tool
)
```


🐳 DOCKER

Build:
  docker build -t my-server .

Run:
  docker run -p 5000:5000 my-server

Compose:
  docker-compose up -d


📋 STRUCTURE DU PROJET

my-server/
├── server.py              # Serveur principal
├── config.json            # Configuration
├── tools.py              # Outils personnalisés
├── requirements.txt      # Dépendances
├── Dockerfile            # Image Docker
├── docker-compose.yml    # Composition
└── README.md             # Documentation


💡 CONSEILS

1. Modifiez config.json pour ajouter vos outils
2. Utilisez tools.py pour organiser votre code
3. Testez localement avant de containeriser
4. Consultez la documentation MCP officielle
5. Versionnez avec git


📞 AIDE

Pour plus d'informations:
- Consultez le README.md du projet créé
- Vérifiez la documentation MCP officielle
- Explorez les outils d'exemple

"""
    print(guide)


def main():
    """Fonction principale"""
    while True:
        print_banner()
        print_menu()

        choice = input("Votre choix (0-3): ").strip()

        if choice == "0":
            print("\n👋 Au revoir!")
            sys.exit(0)
        elif choice == "1":
            create_standard_mcp()
        elif choice == "2":
            create_n8n_mcp()
        elif choice == "3":
            create_custom_mcp()
        elif choice == "?":
            show_quick_start()
        else:
            print("❌ Choix invalide")

        input("\n\nAppuyez sur Entrée pour continuer...")
        os.system("clear" if os.name == "posix" else "cls")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("""
Usage: python launch_mcp.py [OPTIONS]

Sans arguments: Mode interactif

Options:
  --quick-start    Affiche le guide de démarrage
  --help          Affiche cette aide
  --version       Affiche la version

Exemples:
  python launch_mcp.py
  python launch_mcp.py --quick-start
""")
    elif len(sys.argv) > 1 and sys.argv[1] == "--quick-start":
        show_quick_start()
    else:
        try:
            main()
        except KeyboardInterrupt:
            print("\n\n👋 Interruption par l'utilisateur")
            sys.exit(0)
