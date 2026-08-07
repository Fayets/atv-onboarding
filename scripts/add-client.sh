#!/usr/bin/env bash
# Crea un cliente de onboarding y envía el mail con la clave.
# Uso: ./scripts/add-client.sh "Nombre Cliente" email@ejemplo.com Boost
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FORCE=false
ARGS=()
for arg in "$@"; do
  if [[ "$arg" == "--force" ]]; then
    FORCE=true
  else
    ARGS+=("$arg")
  fi
done

NAME="${ARGS[0]:?Falta nombre (ej: Franco-Test)}"
EMAIL="${ARGS[1]:?Falta email}"
PLAN="${ARGS[2]:-Boost}"

ENV_FILE="$ROOT/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: no existe backend/.env"
  exit 1
fi

ADMIN_API_KEY="$(grep -E '^ADMIN_API_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'"'"' || true)"
if [[ -z "$ADMIN_API_KEY" ]]; then
  echo "ERROR: ADMIN_API_KEY vacía en backend/.env"
  exit 1
fi

API_BASE="${API_BASE_URL:-http://127.0.0.1:8000}"
API_BASE="${API_BASE%/}"

if [[ "$FORCE" == true ]]; then
  echo "Forzando cliente (borra sesiones previas del email): $NAME <$EMAIL> plan=$PLAN"
  docker compose exec -T backend python scripts/force_add_client.py "$NAME" "$EMAIL" --plan "$PLAN" --force
  exit $?
fi

echo "Creando cliente: $NAME <$EMAIL> plan=$PLAN"
RESP="$(curl -sS -X POST "$API_BASE/api/admin/add-client" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"plan\":\"$PLAN\"}")"

if echo "$RESP" | grep -q '"session_id"'; then
  echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"
  echo ""
  echo "OK: cliente creado y mail enviado (si SMTP está configurado)."
else
  echo "ERROR:"
  echo "$RESP"
  exit 1
fi
