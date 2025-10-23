#!/bin/bash
# Kill all development servers for chip-player-js

echo "Stopping all development servers..."

# Kill Python catalog file server
if pkill -f "python3.*httpserver.py"; then
  echo "✓ Stopped Python catalog file server (port 8000)"
else
  echo "✗ Python catalog file server not running"
fi

# Kill Node.js API server
if pkill -f "node server/index.js"; then
  echo "✓ Stopped Node.js API server (port 8080)"
else
  echo "✗ Node.js API server not running"
fi

# Kill React development server
if pkill -f "node scripts/start.js"; then
  echo "✓ Stopped React development server (port 3000)"
else
  echo "✗ React development server not running"
fi

echo "Done!"
