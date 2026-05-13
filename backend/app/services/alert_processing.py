import uuid
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.event import Event, MediaClip
from app.models.camera import Camera
from app.models.alert import Alert
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


async def process_event(db: AsyncSession, camera_id: str, payload: dict):
    """Salva un evento, crea un alert e notifica via WebSocket."""
    try:
        # Verifica che la camera esista
        result = await db.execute(select(Camera).where(Camera.id == camera_id))
        camera = result.scalar_one_or_none()
        if not camera:
            logger.warning(f"Camera {camera_id} non trovata per evento.")
            return

        # Crea evento
        event = Event(
            camera_id=camera_id,
            event_type=payload.get("type", "unknown"),
            confidence_score=payload.get("confidence", 0.0),
            timestamp=datetime.utcnow(),
        )
        db.add(event)
        await db.flush()  # per ottenere l'id

        # Crea media clip se presente
        media = payload.get("media")
        if media:
            clip = MediaClip(
                event_id=event.id,
                photo_url=media.get("photo_url"),
                video_url=media.get("video_url"),
                duration=media.get("duration"),
            )
            db.add(clip)

        # Crea alert per il proprietario della camera
        severity = _map_severity(payload.get("type"))
        alert = Alert(
            user_id=camera.user_id,
            event_id=event.id,
            severity=severity,
        )
        db.add(alert)
        await db.commit()  # committa tutto
        await db.refresh(event)  # per eventuale uso successivo

        # Notifica WebSocket alla dashboard del proprietario
        await websocket_manager.send_to_user(
            camera.user_id,
            {
                "type": "new_alert",
                "alert": {
                    "id": str(alert.id),
                    "severity": alert.severity,
                    "event_type": event.event_type,
                    "camera_id": str(camera_id),
                    "camera_name": camera.name,
                    "confidence": event.confidence_score,
                    "timestamp": event.timestamp.isoformat(),
                },
            },
        )
        logger.info(f"Evento {event.event_type} processato per camera {camera_id}")

    except Exception as e:
        logger.error(f"Errore processando evento MQTT: {e}", exc_info=True)
        await db.rollback()


def _map_severity(event_type: str) -> str:
    """Mappa il tipo di evento alla gravità dell'alert."""
    severity_map = {
        "fall": "high",
        "intrusion": "critical",
        "crowd": "medium",
        "vehicle": "low",
        "fire": "critical",
    }
    return severity_map.get(event_type, "medium")