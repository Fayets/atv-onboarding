# ATV Onboarding

Onboarding de nuevos clientes de ATV Consultoría.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React + Vite + JavaScript (`frontend/`) |
| Backend | FastAPI + Python + Pony ORM (`backend/`) |
| Base de datos | Neon PostgreSQL — schema `onboarding` |
| Deploy | Docker + Nginx en VPS |

## Estructura

```
frontend/          # React + Vite
backend/
  main.py
  requirements.txt
  .env.template
  .env             # ignorado por git
  src/
    db.py
    models.py
    schemas.py
    controllers/
      auth_controller.py
      onboarding_controller.py
    services/
      auth_services.py
      onboarding_services.py
      skool_services.py
  sql/init.sql
```

## Desarrollo local

### 1. Base de datos (Neon)

Ejecutá el script de inicialización en tu base `atv_business`:

```bash
psql "$DATABASE_URL" -f backend/sql/init.sql
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.template .env       # completar DATABASE_URL y demás variables
uvicorn main:app --reload
```

El API queda en `http://localhost:8000` — health check en `/health`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`. Vite proxyea `/api` y `/health` al backend.

## Variables de entorno

Ver `backend/.env.template`:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon (`atv_business`) |
| `SKOOL_WEBHOOK_URL` | URL base del webhook de Skool (sin email) |
| `DISCORD_INVITE_URL` | Link de invitación a Discord |
| `SESSION_COOKIE_SECURE` | `true` en producción con HTTPS |
| `CORS_ORIGINS` | Orígenes permitidos (coma-separados) |

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | Login con contraseña temporal |
| GET | `/api/auth/session` | Datos de sesión actual |
| POST | `/api/onboarding/submit-form` | Guardar formulario en Neon |
| POST | `/api/onboarding/join-skool` | Enviar invitación a Skool |

## Tablas (schema `onboarding`)

- `sessions` — reemplaza la tabla `passwords` de Supabase
- `forms` — respuestas del formulario en JSONB
