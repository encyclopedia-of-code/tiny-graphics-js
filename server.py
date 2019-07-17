import sys

PORT = 8000

if sys.version_info < (3, 0):
    import SimpleHTTPServer
    import SocketServer

    class Handler(SimpleHTTPServer.SimpleHTTPRequestHandler):
        pass

    Handler.extensions_map = {
        '.manifest': 'text/cache-manifest',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.js':  'application/x-javascript',
        '': 'application/octet-stream', # Default
    }
    
    httpd = SocketServer.TCPServer(("", PORT), Handler)

    print("serving at port", PORT)
    httpd.serve_forever()


else:
    import http.server
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import socketserver

    Handler = http.server.SimpleHTTPRequestHandler

    Handler.extensions_map={
        '.manifest': 'text/cache-manifest',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
        '.css': 'text/css',
        '.js':  'application/x-javascript',
        '': 'application/octet-stream', # Default
    }

    httpd = socketserver.TCPServer(("", PORT), Handler)

    print("serving at port", PORT)
    httpd.serve_forever()