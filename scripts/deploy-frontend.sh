#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Repo: $ROOT"
echo "==> Fetch + pull (master)"
git fetch origin
git checkout master
git pull origin master

COMMIT="$(git rev-parse --short HEAD)"
echo "==> Commit: $COMMIT $(git log -1 --pretty=%s)"

if ! grep -q 'Reenviar clave' frontend/src/pages/DashboardPage.jsx; then
  echo "ERROR: el código fuente NO tiene los cambios nuevos (Reenviar clave)."
  echo "       Revisá branch/remoto antes de construir la imagen."
  exit 1
fi

echo "==> Build frontend (sin caché)"
docker builder prune -f >/dev/null 2>&1 || true
docker compose build --no-cache frontend

echo "==> Recrear contenedor frontend"
docker compose up -d --force-recreate frontend

echo "==> Verificar bundle dentro del contenedor"
FRONTEND_CID="$(docker compose ps -q frontend)"
docker exec "$FRONTEND_CID" sh -c "
  JS=\$(ls /usr/share/nginx/html/assets/index-*.js | head -1)
  echo \"Bundle: \$(basename \"\$JS\")\"
  if grep -q 'Reenviar clave' \"\$JS\"; then
    echo 'OK: bundle contiene Reenviar clave'
  else
    echo 'ERROR: bundle viejo (Call agendada / sin Reenviar clave)'
    exit 1
  fi
"

echo "==> Verificar puerto local 8080"
LOCAL_INDEX="$(curl -sS http://127.0.0.1:8080/ | grep -o 'index-[^\"]*\\.js' | head -1 || true)"
echo "index.html apunta a: ${LOCAL_INDEX:-NO ENCONTRADO}"

if curl -sS "http://127.0.0.1:8080/assets/${LOCAL_INDEX}" | grep -q 'Reenviar clave'; then
  echo "OK: localhost:8080 sirve el frontend nuevo"
else
  echo "WARN: localhost:8080 no sirve el bundle esperado"
fi

echo ""
echo "Deploy frontend listo ($COMMIT)."
echo "Si https://onboarding.atvos.io sigue viejo, el nginx del host NO apunta a :8080"
echo "o hay otro root estático. Compará:"
echo "  curl -s https://onboarding.atvos.io/ | grep index-"
echo "  curl -s http://127.0.0.1:8080/ | grep index-"
