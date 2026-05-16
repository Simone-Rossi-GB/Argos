import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class MediaClipBase(BaseModel):
    """Dati di un clip media (foto o video)."""
    photo_url: str | None = None
    video_url: str | None = None
    duration: int | None = None  # secondi


class MediaClipCreate(MediaClipBase):
    """Richiesta per creare un clip media."""
    pass


class MediaClipRead(MediaClipBase):
    """Risposta con i dati di un clip media."""
    id: uuid.UUID
    event_id: uuid.UUID

    model_config = {"from_attributes": True}


class EventCreate(BaseModel):
    """Richiesta per registrare un evento (arriva via MQTT dalla camera)."""
    camera_id: uuid.UUID
    event_type: str = Field(..., pattern=r"^(fall|intrusion|crowd|vehicle|fire)$")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    timestamp: datetime | None = None  # se non specificato, usa il server time
    media: MediaClipCreate | None = None  # clip opzionale inviato con l'evento


class EventRead(BaseModel):
    """Risposta con i dati completi di un evento."""
    id: uuid.UUID
    camera_id: uuid.UUID
    event_type: str
    confidence_score: float
    timestamp: datetime
    media_clips: list[MediaClipRead] = []

    model_config = {"from_attributes": True}