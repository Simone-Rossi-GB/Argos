import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.camera import Camera
from app.models.event import Event, MediaClip
from app.schemas.event import EventCreate, EventRead
from app.utils.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
internal_router = APIRouter()


@router.get("/", response_model=list[EventRead])
async def list_events(
    camera_id: uuid.UUID | None = Query(default=None),
    event_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista eventi filtrati per camera e/o tipo (solo camere dell'utente)."""
    query = (
        select(Event)
        .join(Camera, Event.camera_id == Camera.id)
        .where(Camera.user_id == current_user.id)
        .options(selectinload(Event.media_clips))
        .order_by(desc(Event.timestamp))
        .limit(limit)
        .offset(offset)
    )

    if camera_id:
        query = query.where(Event.camera_id == camera_id)
    if event_type:
        query = query.where(Event.event_type == event_type)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{event_id}", response_model=EventRead)
async def get_event(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dettaglio di un evento con media clips."""
    result = await db.execute(
        select(Event)
        .join(Camera, Event.camera_id == Camera.id)
        .where(Event.id == event_id, Camera.user_id == current_user.id)
        .options(selectinload(Event.media_clips))
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@internal_router.post("/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: EventCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Registra un nuovo evento.
    Chiamato dal client MQTT, non richiede autenticazione utente.
    """
    # Verifica che la camera esista
    result = await db.execute(select(Camera).where(Camera.id == data.camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    event = Event(
        camera_id=data.camera_id,
        event_type=data.event_type,
        confidence_score=data.confidence_score,
        timestamp=data.timestamp or datetime.utcnow(),
    )
    db.add(event)
    await db.flush()

    # Se l'evento include dati media, crea i clip
    if data.media:
        clip = MediaClip(
            event_id=event.id,
            photo_url=data.media.photo_url,
            video_url=data.media.video_url,
            duration=data.media.duration,
        )
        db.add(clip)
        await db.flush()

    # Ricarica l'evento con le relazioni
    result = await db.execute(
        select(Event)
        .where(Event.id == event.id)
        .options(selectinload(Event.media_clips))
    )
    return result.scalar_one()