import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.database import async_session
from app.utils.security import get_user_from_token
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    """
    Connessione WebSocket per la dashboard.
    Il token JWT può essere passato come query parameter o Authorization header.
    """
    if token is None:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if token is None:
        logger.warning("WebSocket authentication failed: missing token")
        await websocket.close(code=4001)
        return

    user = None
    async with async_session() as db:
        try:
            user = await get_user_from_token(token, db)
        except Exception as e:
            logger.warning(f"WebSocket authentication failed: {e}")
            await websocket.close(code=4001)
            return

    if user is None:
        logger.warning("WebSocket authentication failed: invalid token")
        await websocket.close(code=4001)
        return

    await websocket.accept()
    user_id_str = str(user.id)
    websocket_manager.connect(user_id_str, websocket)

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