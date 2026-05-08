import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class CameraCreate(BaseModel):
    """Richiesta per registrare una nuova telecamera."""
    name: str = Field(..., min_length=1, max_length=255, examples=["Ingresso principale"])
    lat: float = Field(..., ge=-90, le=90, examples=[45.4642])
    lng: float = Field(..., ge=-180, le=180, examples=[9.1900])
    module_type: str = Field(..., pattern=r"^(fall|intrusion|crowd|vehicle|fire)$")
    default_quality: str = Field(default="720p", pattern=r"^(360p|720p|1080p)$")


class CameraUpdate(BaseModel):
    """Richiesta per modificare una telecamera esistente. Tutti i campi sono opzionali."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    module_type: str | None = Field(default=None, pattern=r"^(fall|intrusion|crowd|vehicle|fire)$")
    default_quality: str | None = Field(default=None, pattern=r"^(360p|720p|1080p)$")


class CameraRead(BaseModel):
    """Risposta con i dati completi di una telecamera."""
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    lat: float
    lng: float
    module_type: str
    default_quality: str
    status: str
    last_seen: datetime | None

    model_config = {"from_attributes": True}


class CameraStatus(BaseModel):
    """Stato attuale di una telecamera (usato per update rapidi via MQTT)."""
    status: str = Field(..., pattern=r"^(online|offline|alert)$")
    last_seen: datetime | None = None