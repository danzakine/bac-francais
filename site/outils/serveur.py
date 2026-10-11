"""Serveur local du site (Python 3, bibliothèque standard uniquement).

Usage :  python3 outils/serveur.py [port]      (par défaut 8000)
Les adresses de l'application (/bibliotheque, /oeuvres/pot-bouille…) sont renvoyées vers index.html,
comme le fait la règle de réécriture de vercel.json en production.
"""
import http.server
import socketserver
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".svg": "image/svg+xml",
    }

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        target = SITE / path.lstrip("/")
        # Route applicative : pas de fichier correspondant et pas d'extension -> index.html
        if not target.exists() and "." not in Path(path).name:
            self.path = "/index.html"
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            sys.stderr.write("404 : %s\n" % self.path)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Site disponible sur http://localhost:{PORT}  (Ctrl+C pour arrêter)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
