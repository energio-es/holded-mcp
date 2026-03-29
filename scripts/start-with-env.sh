#!/bin/bash
# Wrapper script to load .env.local and start the MCP server
# Used for local development with Cursor IDE

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env.local if it exists
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.local" | grep -v '^$' | xargs)
fi

# Start the MCP server
exec node "$PROJECT_DIR/dist/index.js"
