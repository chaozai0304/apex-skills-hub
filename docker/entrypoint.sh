#!/bin/sh
set -e

echo "[entrypoint] Bootstrapping database..."
node scripts/bootstrap-database.mjs

echo "[entrypoint] Starting application..."
exec "$@"
