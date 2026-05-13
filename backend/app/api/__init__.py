from fastapi import APIRouter
from app.api import auth, cameras, events, alerts, stream

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(stream.router, prefix="/stream", tags=["stream"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
api_router.include_router(metadata.router, prefix="/system", tags=["system"])