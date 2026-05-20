import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Gestisce le connessioni WebSocket per notifiche real-time."""

    def __init__(self):
        # Mappa: user_id (stringa) -> lista di WebSocket attive
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        """Accetta la connessione e la registra per l'utente."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connesso per user {user_id} (totale: {len(self.active_connections[user_id])})")

    def disconnect(self, user_id: str, websocket: WebSocket):
        """Rimuove una connessione WebSocket."""
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
            except ValueError:
                pass  # già rimossa
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"WebSocket disconnesso per user {user_id}")

    async def send_to_user(self, user_id, data: dict):
        """Invia un messaggio JSON a tutte le connessioni di un utente."""
        user_id_str = str(user_id)
        if user_id_str not in self.active_connections:
            return
        message = json.dumps(data)
        dead_connections = []
        for ws in self.active_connections[user_id_str]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.append(ws)
        # Pulisci connessioni morte
        for ws in dead_connections:
            self.disconnect(user_id_str, ws)

    async def broadcast(self, data: dict):
        """Invia un messaggio a tutti gli utenti connessi."""
        message = json.dumps(data)
        for user_id in list(self.active_connections.keys()):
            dead_connections = []
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead_connections.append(ws)
            for ws in dead_connections:
                self.disconnect(user_id, ws)


# Istanza globale
websocket_manager = WebSocketManager()