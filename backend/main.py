from contextlib import asynccontextmanager

from decouple import config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.controllers import admin_controller, auth_controller, health_controller, onboarding_controller
from src.db import init_db
from src.schemas import HealthResponse
from src.services.discord_bot import start_discord_bot_thread

CORS_ORIGINS = config(
    "CORS_ORIGINS",
    default="http://localhost:5173",
    cast=lambda v: [origin.strip() for origin in v.split(",") if origin.strip()],
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    start_discord_bot_thread()
    yield


app = FastAPI(title="ATV Onboarding API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_controller.router)
app.include_router(onboarding_controller.router)
app.include_router(health_controller.router)
app.include_router(admin_controller.router)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse()
