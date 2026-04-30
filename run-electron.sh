#!/usr/bin/env bash
# Arranca la app completa: DB + backend (Docker) + build Angular + Electron.
#
# Uso:
#   ./run-electron.sh               # arranca todo
#   ./run-electron.sh --skip-build  # salta el build de Angular (usa dist existente)
#   ./run-electron.sh --skip-docker # no toca Docker (ya está corriendo)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"

SKIP_BUILD=false
SKIP_DOCKER=false
for arg in "$@"; do
  case "$arg" in
    --skip-build)  SKIP_BUILD=true ;;
    --skip-docker) SKIP_DOCKER=true ;;
  esac
done

# ── 1. Backend (Docker) ────────────────────────────────────────────────────
if [[ "$SKIP_DOCKER" == false ]]; then
  echo "── Iniciando DB y backend (Docker) ───────────────────────────"
  cd "$SCRIPT_DIR"
  docker-compose up -d db backend

  echo "── Esperando a que el backend responda en :8008 ──────────────"
  for i in $(seq 1 30); do
    if curl -sf http://localhost:8008/health > /dev/null 2>&1 || \
       curl -sf http://localhost:8008/docs   > /dev/null 2>&1; then
      echo "   Backend listo."
      break
    fi
    if [[ $i -eq 30 ]]; then
      echo "   Aviso: el backend no respondió en 30s, continuando de todas formas."
    fi
    sleep 1
  done
fi

# ── 2. Build Angular ───────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  echo "── Building Angular ──────────────────────────────────────────"
  cd "$APP_DIR"
  npm run build
  echo "── Build completo ────────────────────────────────────────────"
fi

# ── 3. Electron ───────────────────────────────────────────────────────────
echo "── Lanzando Electron ─────────────────────────────────────────"
cd "$APP_DIR"
npx electron .
