import argparse
import http.server
import socketserver

parser = argparse.ArgumentParser()
parser.add_argument("port", nargs="?", type=int, default=8000, help="Port to serve on (default: 8000)")
args = parser.parse_args()

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
    '.obj': 'text/plain',
    '.wasm': 'application/wasm',
})

try:
    with socketserver.TCPServer(("", args.port), Handler) as httpd:
        print(f"Serving at port {args.port}. Launch your web browser and navigate to localhost:{args.port}.")
        httpd.serve_forever()
except OSError as e:
    print(f"Error: Could not start server on port {args.port}: {e.strerror}")

