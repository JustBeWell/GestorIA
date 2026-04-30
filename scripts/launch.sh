#!/usr/bin/env bash
# =============================================================
#  GestorIA — Launcher completo
#  Construye y arranca: base de datos, backend y Electron
# =============================================================
set -euo pipefail

# ── Colores ──────────────────────────────────────────────────
BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[GestorIA]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
err()  { echo -e "${RED}  ✗ ERROR:${NC} $1"; exit 1; }

# ── Rutas ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── PATH: Docker Desktop + Homebrew + nvm ────────────────────
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh" --no-use

# ── Comprobaciones previas ───────────────────────────────────
command -v docker  >/dev/null 2>&1 || err "Docker no encontrado. Instala Docker Desktop."
command -v npm     >/dev/null 2>&1 || err "npm no encontrado. Instala Node.js."

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          GestorIA — Iniciando            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Paso 1: Docker — db + backend ────────────────────────────
log "Paso 1/3 — Construyendo e iniciando db + backend..."
cd "$PROJECT_ROOT"
docker-compose up -d --build db backend
ok "Servicios Docker activos (db → 5432, backend → 8008)"

# ── Paso 2: Angular build ────────────────────────────────────
log "Paso 2/3 — Compilando frontend Angular..."
cd "$PROJECT_ROOT/app"
npm run build
ok "Build Angular completado"

# ── Paso 3: Electron ─────────────────────────────────────────
log "Paso 3/3 — Iniciando Electron..."
npm run start:desktop
