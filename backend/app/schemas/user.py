import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Richiesta di registrazione."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    """Richiesta di login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Risposta con JWT."""
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    """Risposta con dati utente (senza password)."""
    id: uuid.UUID
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}