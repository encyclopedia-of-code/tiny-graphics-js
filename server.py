import argparse
import http.server
import socketserver
import os

parser = argparse.ArgumentParser()
parser.add_argument("port", nargs="?", type=int, default=8000, help="Port to serve on (default: 8000)")
args = parser.parse_args()


MINIMAL_PNG = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
    b'\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
    b'\x00\x00\x00\nIDATx\xda\x63\x00\x01\x00\x00\x05\x00\x01'
    b'\x0d\n\x2d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            accept = self.headers.get('Accept', '')
            self.is_image_request = 'image/' in accept and not 'text/html' in accept
            
            if self.is_image_request:
                self.send_response(200)
                self.send_header("Content-type", "image/png")
                self.send_header("Content-Length", str(len(MINIMAL_PNG)))
                self.end_headers()
                return None
            else:
                self.send_response(404)
                self.send_header("Content-type", "text/plain")
                self.end_headers()
                self.wfile.write(b"404 Not Found")
                return None
        return super().send_head()

    def do_GET(self):
        res = self.send_head()
        if res is None:
            if getattr(self, 'is_image_request', False):
                self.wfile.write(MINIMAL_PNG)
        else:
            if res:
                self.copyfile(res, self.wfile)

CustomHandler.extensions_map.update({
    '.obj': 'text/plain',
    '.wasm': 'application/wasm',
})

try:
    with socketserver.TCPServer(("", args.port), CustomHandler) as httpd:
        print(f"Serving at port {args.port}. Launch your web browser and navigate to localhost:{args.port}.")
        httpd.serve_forever()
except OSError as e:
    print(f"Error: Could not start server on port {args.port}: {e.strerror}")

