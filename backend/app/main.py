from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.core.database import engine, Base
from app.models.user import User
from app.schemas.user import UserRead
from app.services.mqtt_client import mqtt_manager
from app.services.websocket_manager import websocket_manager
from app.utils.security import get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────
    # Crea le tabelle (solo sviluppo, in produzione si usa Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Avvia il client MQTT
    await mqtt_manager.start()

    # Il WebSocket manager non ha bisogno di start esplicito,
    # tiene le connessioni in memoria

    yield

    # ── Shutdown ─────────────────────────
    await mqtt_manager.stop()
    await engine.dispose()


app = FastAPI(
    title="Argos Backend",
    description="Sistema distribuito di sorveglianza comunitaria",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router REST ────────────────────────
app.include_router(api_router, prefix="/api/v1")


# ── Endpoint /me ───────────────────────
@app.get("/api/v1/me", response_model=UserRead, tags=["user"])
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


# ── Health check ───────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}