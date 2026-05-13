import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.camera import Camera
from app.utils.security import get_current_user

router = APIRouter()


@router.post("/{camera_id}/start")
async def start_stream(
    camera_id: uuid.UUID,
    quality: str = "720p",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Richiede l'avvio dello stream HLS per una camera.
    Invia un comando MQTT alla camera e restituisce l'URL HLS.
    """
    result = await db.execute(
        select(Camera).where(Camera.id == camera_id, Camera.user_id == current_user.id)
    )
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    if camera.status == "offline":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Camera is offline")

    # TODO: inviare comando MQTT alla camera per avviare lo stream
    # mqtt_client.publish(f"cameras/{camera_id}/command", {"action": "start", "quality": quality})

    hls_url = f"http://{settings.mediamtx_host}:{settings.mediamtx_port}/{camera_id}/index.m3u8"

    return {
        "camera_id": str(camera_id),
        "status": "starting",
        "hls_url": hls_url,
        "quality": quality,
    }


@router.post("/{camera_id}/stop")
async def stop_stream(
    camera_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ferma lo stream HLS di una camera.
    Invia un comando MQTT alla camera.
    """
    result = await db.execute(
        select(Camera).where(Camera.id == camera_id, Camera.user_id == current_user.id)
    )
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camera not found")

    # TODO: inviare comando MQTT alla camera per fermare lo stream
    # mqtt_client.publish(f"cameras/{camera_id}/command", {"action": "stop"})

    return {
        "camera_id": str(camera_id),
        "status": "stopping",
    }