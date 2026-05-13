import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.database import async_session
from app.utils.security import get_user_from_token
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Connessione WebSocket per la dashboard.
    Il token JWT va passato come query parameter: ws://host/api/v1/ws?token=xxxxxxx
    """
    user = None
    async with async_session() as db:
        try:
            user = await get_user_from_token(token, db)
        except Exception as e:
            logger.warning(f"Autenticazione WebSocket fallita: {e}")
            await websocket.close(code=4001)
            return

    user_id_str = str(user.id)
    await websocket_manager.connect(user_id_str, websocket)

    try:
        # Mantiene la connessione aperta e ascolta messaggi di ping/pong
        while True:
            # Aspetta qualsiasi messaggio (può essere usato per heartbeat)
            data = await websocket.receive_text()
            # Qui potresti gestire comandi dal client se necessario
            logger.debug(f"Messaggio WebSocket da {user.email}: {data}")
    except WebSocketDisconnect:
        websocket_manager.disconnect(user_id_str, websocket)
    except Exception as e:
        logger.error(f"Errore WebSocket: {e}")
        websocket_manager.disconnect(user_id_str, websocket)