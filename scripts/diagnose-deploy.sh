#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== Git ==="
git remote -v
git branch -vv
git log -1 --oneline
echo ""

echo "=== Código fuente (DashboardPage) ==="
if grep -q 'Reenviar clave' frontend/src/pages/DashboardPage.jsx; then
  echo "OK: Reenviar clave presente en src"
else
  echo "VIEJO: falta Reenviar clave — git pull no trajo 67ce4de"
fi
if grep -q 'Call agendada' frontend/src/pages/DashboardPage.jsx; then
  echo "VIEJO: Call agendada todavía en src"
fi
echo ""

echo "=== Docker ==="
docker compose ps
echo ""

FRONTEND_CID="$(docker compose ps -q frontend 2>/dev/null || true)"
if [[ -n "$FRONTEND_CID" ]]; then
  echo "=== Bundle en contenedor ==="
  docker exec "$FRONTEND_CID" sh -c '
    ls -la /usr/share/nginx/html/assets/index-*.js
    JS=$(ls /usr/share/nginx/html/assets/index-*.js | head -1)
    basename "$JS"
    grep -o "Reenviar clave\|Call agendada" "$JS" | sort -u
  '
  echo ""
fi

echo "=== localhost:8080 ==="
curl -sS http://127.0.0.1:8080/ 2>/dev/null | grep -o 'index-[^"]*\.js' | head -1 || echo "no responde en 8080"
echo ""

echo "=== Público onboarding.atvos.io ==="
curl -sS https://onboarding.atvos.io/ 2>/dev/null | grep -o 'index-[^"]*\.js' | head -1 || echo "no responde"
PUBLIC_JS="$(curl -sS https://onboarding.atvos.io/ 2>/dev/null | grep -o 'index-[^"]*\.js' | head -1 || true)"
if [[ -n "$PUBLIC_JS" ]]; then
  curl -sS "https://onboarding.atvos.io/assets/${PUBLIC_JS}" | grep -o 'Reenviar clave\|Call agendada' | sort -u || true
fi

echo ""
echo "Si contenedor tiene Reenviar clave pero el dominio público no,"
echo "nginx del host sirve archivos de otro lugar (no docker :8080)."
