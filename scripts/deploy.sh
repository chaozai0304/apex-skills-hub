#!/bin/sh
set -e

mkdir -p data storage/archives

echo "[deploy] Building and starting apex-skills-hub via Docker Compose..."
docker compose up -d --build

echo "[deploy] Done."
