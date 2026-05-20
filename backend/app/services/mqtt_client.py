import asyncio
import json
import logging
from typing import Any

import aiomqtt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session
from app.services.alert_processing import process_event

logger = logging.getLogger(__name__)

class MQTTManager:
    """Gestisce la connessione MQTT e l'inoltro dei messaggi."""

    def __init__(self):
        self.client: aiomqtt.Client | None = None
        self._task: asyncio.Task | None = None

    async def start(self):
        """Avvia la connessione e sottoscrive i topic."""
        self._task = asyncio.create_task(self._run())

    async def stop(self):
        """Ferma il client e il task."""
        if self.client:
            await self.client.__aexit__(None, None, None)  # forza disconnessione
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("MQTT client stopped")

    async def publish(self, topic: str, payload: dict):
        """Pubblica un messaggio JSON su un topic."""
        if not self.client:
            logger.warning("MQTT client non ancora connesso, impossibile pubblicare")
            return
        message = json.dumps(payload)
        await self.client.publish(topic, message.encode(), qos=1)
        logger.debug(f"Published to {topic}: {message}")

    async def _run(self):
        """Task principale: connessione e ascolto con riconnessione automatica."""
        while True:
            try:
                async with aiomqtt.Client(
                    hostname=settings.mqtt_host,
                    port=settings.mqtt_port,
                    keepalive=30,
                ) as client:
                    self.client = client
                    logger.info(f"Connesso a MQTT broker {settings.mqtt_host}")

                    # Sottoscrizioni
                    await client.subscribe("cameras/+/events", qos=2)
                    await client.subscribe("cameras/+/status", qos=2)
                    logger.info("Sottoscritto a cameras/+/events e cameras/+/status")

                    # Loop di ricezione messaggi
                    async for message in client.messages:
                        await self._dispatch(message)
            except (aiomqtt.MqttError, ConnectionError, asyncio.CancelledError) as e:
                logger.warning(f"Connessione MQTT persa: {e}. Riconnessione tra 5 secondi...")
                self.client = None
                await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Errore inaspettato MQTT: {e}", exc_info=True)
                self.client = None
                await asyncio.sleep(5)

    async def _dispatch(self, message: aiomqtt.Message):
        """Smista i messaggi MQTT in base al topic."""
        topic = str(message.topic)
        try:
            payload = json.loads(message.payload.decode())
        except json.JSONDecodeError:
            logger.warning(f"Payload non JSON su {topic}: {message.payload}")
            return

        logger.debug(f"Messaggio ricevuto su {topic}: {payload}")

        # camera_id è il secondo segmento del topic
        parts = topic.split("/")
        if len(parts) < 3:
            return
        camera_id = parts[1]
        msg_type = parts[2]

        if msg_type == "events":
            await self._handle_event(camera_id, payload)
        elif msg_type == "status":
            await self._handle_status(camera_id, payload)

    async def _handle_event(self, camera_id: str, payload: dict):
        """Processa un evento ricevuto da una camera."""
        async with async_session() as db:
            await process_event(db, camera_id, payload)

    async def _handle_status(self, camera_id: str, payload: dict):
        """Aggiorna lo stato di una camera."""
        status_value = payload.get("status", "offline")
        last_seen = payload.get("last_seen")  # opzionale
        from datetime import datetime
        from sqlalchemy import select
        from app.models.camera import Camera

        async with async_session() as db:
            result = await db.execute(select(Camera).where(Camera.id == camera_id))
            camera = result.scalar_one_or_none()
            if camera:
                camera.status = status_value
                if last_seen:
                    camera.last_seen = datetime.fromisoformat(last_seen)
                else:
                    camera.last_seen = datetime.utcnow()
                await db.commit()
                logger.info(f"Stato camera {camera_id} aggiornato a {status_value}")


# Istanza globale, inizializzata nel lifespan
mqtt_manager = MQTTManager()