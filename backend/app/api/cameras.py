import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.camera import Camera
from app.schemas.camera import CameraCreate, CameraUpdate, CameraRead, CameraStatus
from app.utils.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[CameraRead])
async def list_cameras(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista tutte le camere dell'utente autenticato."""
    result = await db.execute(
        select(Camera).where(Camera.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=CameraRead, status_code=status.HTTP_201_CREATED)
async def create_camera(
    data: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra una nuova telecamera."""
    camera = Camera(
        user_id=current_user.id,
        name=data.name,
        lat=data.lat,
        lng=data.lng,
        module_type=data.module_type,
        default_quality=data.default_quality,
    )
    db.add(camera)
    await db.flush()
    await db.refresh(camera)
    return camera


@router.get("/{camera_id}", response_model=CameraRead)
async def get_camera(
    camera_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dettaglio di una telecamera."""
    result = await db.execute(
        select(Camera).where(Camera.id == camera_id, Camera.user_id == current_user.id)
    )
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")
    return camera


@router.patch("/{camera_id}", response_model=CameraRead)
async def update_camera(
    camera_id: uuid.UUID,
    data: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Modifica una telecamera."""
    result = await db.execute(
        select(Camera).where(Camera.id == camera_id, Camera.user_id == current_user.id)
    )
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(camera, key, value)

    await db.flush()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina una telecamera."""
    result = await db.execute(
        select(Camera).where(Camera.id == camera_id, Camera.user_id == current_user.id)
    )
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    await db.delete(camera)


# Endpoint per le camere: aggiornamento stato (chiamato via MQTT internamente)
@router.patch("/{camera_id}/status", response_model=CameraRead)
async def update_camera_status(
    camera_id: uuid.UUID,
    data: CameraStatus,
    db: AsyncSession = Depends(get_db),
):
    """
    Aggiorna lo stato di una camera (online/offline/alert).
    Chiamato dal client MQTT, non richiede autenticazione.
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    camera.status = data.status
    camera.last_seen = data.last_seen or datetime.utcnow()

    await db.flush()
    await db.refresh(camera)
    return camera