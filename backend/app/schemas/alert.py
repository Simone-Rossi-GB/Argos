import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    """Richiesta per creare un alert (generato automaticamente dal backend)."""
    user_id: uuid.UUID
    event_id: uuid.UUID
    severity: str = Field(default="medium", pattern=r"^(low|medium|high|critical)$")


class AlertUpdate(BaseModel):
    """Richiesta per marcare un alert come letto."""
    read_at: datetime | None = None  # se None, imposta a datetime.utcnow()


class AlertRead(BaseModel):
    """Risposta con i dati completi di un alert."""
    id: uuid.UUID
    user_id: uuid.UUID
    event_id: uuid.UUID
    severity: str
    sent_at: datetime
    read_at: datetime | None

    model_config = {"from_attributes": True}