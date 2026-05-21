from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.api.health import router as health_router
from app.core.database import engine, Base
from app.core.logging import setup_logging
from app.services.mqtt_client import mqtt_manager
from app.services.websocket_manager import websocket_manager


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


logger = setup_logging()

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


@app.middleware("http")
async def log_error_responses(request: Request, call_next):
    response = await call_next(request)
    if response.status_code >= 400:
        body_text = "<unavailable>"
        try:
            if hasattr(response, "body") and isinstance(response.body, (bytes, str)):
                body_text = response.body.decode("utf-8", errors="replace") if isinstance(response.body, bytes) else response.body
            elif hasattr(response, "media"):
                body_text = str(response.media)
        except Exception:
            body_text = "<failed to read response body>"

        logger.error(
            "%s %s %s %s",
            request.method,
            request.url.path,
            response.status_code,
            body_text,
        )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("%s %s 422 %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error("%s %s %s %s", request.method, request.url.path, exc.status_code, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def internal_exception_handler(request: Request, exc: Exception):
    logger.exception("%s %s 500 internal server error", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


# ── Router REST ────────────────────────
app.include_router(api_router, prefix="/api/v1")
app.include_router(health_router)

