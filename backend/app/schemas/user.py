import uuid
from datetime import datetime
from pydantic import BaseModel

class UserRead(BaseModel):
    """Risposta con dati utente (senza password)."""
    id: uuid.UUID
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}