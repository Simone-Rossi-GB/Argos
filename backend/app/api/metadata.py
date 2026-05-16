# app/api/metadata.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.routing import APIRoute
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/endpoints", tags=["system"])
async def list_all_endpoints(current_user: User = Depends(get_current_user)):
    """
    Restituisce la lista di tutti gli endpoint API disponibili.
    Richiede autenticazione.
    """
    from app.api import api_router
    from app.main import app
    
    endpoints = []
    
    def extract_routes(routes, prefix=""):
        for route in routes:
            # Per APIRouter, esplora ricorsivamente
            if hasattr(route, "routes"):
                extract_routes(route.routes, prefix + getattr(route, "prefix", ""))
            # Per le route normali
            elif isinstance(route, APIRoute):
                methods = list(route.methods) if route.methods else []
                endpoints.append({
                    "path": prefix + route.path,
                    "methods": sorted(methods),
                    "name": route.name,
                    "summary": route.summary,
                    "description": route.description,
                })
    
    # Estrai tutte le route dal router principale
    extract_routes(api_router.routes)
    
    return {
        "total": len(endpoints),
        "endpoints": endpoints
    }


@router.get("/endpoints/public", tags=["system"])
async def list_public_endpoints():
    """
    Restituisce la lista degli endpoint pubblici (senza autenticazione).
    """
    public_paths = [
        "/auth/register",
        "/auth/login",
        "/cameras/{camera_id}/status",
        "/events/",
        "/alerts/",
    ]
    
    return {
        "total": len(public_paths),
        "endpoints": public_paths
    }