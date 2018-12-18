#!/bin/bash
cd "$(dirname "$0")"
python -m http.server
python -m SimpleHTTPServer
