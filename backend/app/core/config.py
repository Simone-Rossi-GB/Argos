import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ──────────────────────────
    database_url: str = "postgresql+asyncpg://argos:argos@argos-db:5432/argos"

    # ── MQTT ──────────────────────────────
    mqtt_host: str = "argos-mqtt"
    mqtt_port: int = 1883

    # ── MediaMTX ──────────────────────────
    mediamtx_host: str = "argos-mediamtx"
    mediamtx_port: int = 8888

    # ── JWT ───────────────────────────────
    jwt_secret_key: str = "change-me-to-a-random-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # ── Upload ────────────────────────────
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 20

    # ── MinIO / Object storage ───────────
    minio_enabled: bool = False
    minio_endpoint: str = "minio:9000"
    minio_public_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket: str = "uploads"
    minio_secure: bool = False

    # ── Debug ─────────────────────────────
    debug: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "env_prefix": "",
    }


settings = Settings()

# Crea la directory upload se non esiste solo se MinIO non abilitato
if not settings.minio_enabled:
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)