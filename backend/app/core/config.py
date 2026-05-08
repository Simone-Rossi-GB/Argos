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

    # ── Debug ─────────────────────────────
    debug: bool = True

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "env_prefix": "",
    }


settings = Settings()

# Crea la directory upload se non esiste
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)