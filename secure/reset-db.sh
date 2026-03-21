#!/usr/bin/env bash
# SMVWA — database reset helper
#
# Usage:
#   ./reset-db.sh              — soft reset: reinit tables + seed (containers stay up)
#   ./reset-db.sh --hard       — hard reset: wipe Docker volume, full rebuild + seed
#   ./reset-db.sh --no-seed    — soft reset without demo data
#   ./reset-db.sh --hard --no-seed

set -euo pipefail

HARD=false
SEED_FLAG=""

for arg in "$@"; do
  case $arg in
    --hard)     HARD=true ;;
    --no-seed)  SEED_FLAG="--no-seed" ;;
  esac
done

cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════╗"
echo "║   SMVWA  —  Database Reset       ║"
echo "╚══════════════════════════════════╝"
echo ""

if $HARD; then
  echo "[hard] Stopping containers and wiping postgres_data volume…"
  docker-compose down -v
  echo "[hard] Rebuilding and starting containers…"
  docker-compose up -d --build
  echo "[hard] Waiting for backend to be ready…"
  sleep 5
else
  echo "[soft] Using running containers (start them first if needed)."
  # Ensure backend is up
  if ! docker ps --format '{{.Names}}' | grep -q smvwa_backend; then
    echo "[soft] smvwa_backend is not running — starting containers…"
    docker-compose up -d
    sleep 5
  fi
fi

echo ""
echo "[init] Running database initialisation…"
docker-compose exec -T backend node db/init.js $SEED_FLAG

echo ""
echo "Done. Application is available at http://localhost:3000"
