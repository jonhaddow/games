#!/usr/bin/env bash
# Screenshots a page of the local app on the e2e database.
# Usage: scripts/shot.sh / [out.png] [shot flags: --desktop --full --el <css> --state <file>]
# Starts the e2e dev server on port 5192 if it isn't running (stop: scripts/shot.sh --stop).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=5192
if [ "${1:-}" = "--stop" ]; then pkill -f "vite dev --port $PORT" || true; exit 0; fi
if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
	./e2e/reset-db.sh
	E2E_DB=.wrangler/e2e/v3 setsid npx vite dev --port $PORT --strictPort > /tmp/games-shot-dev.log 2>&1 &
	for _ in $(seq 60); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 1; done
fi
path=$1; shift
exec shot "http://localhost:$PORT$path" "$@"
