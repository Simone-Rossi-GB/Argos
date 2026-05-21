import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.alert import Alert
from app.models.event import Event
from app.schemas.alert import AlertCreate, AlertRead, AlertUpdate
from app.utils.security import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
internal_router = APIRouter()


@router.get("/", response_model=list[AlertRead])
async def list_alerts(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista alert dell'utente, con filtro opzionale 'solo non letti'."""
    query = (
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(desc(Alert.sent_at))
        .limit(limit)
        .offset(offset)
    )

    if unread_only:
        query = query.where(Alert.read_at.is_(None))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{alert_id}", response_model=AlertRead)
async def get_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dettaglio di un alert."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=AlertRead)
async def update_alert(
    alert_id: uuid.UUID,
    data: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca un alert come letto."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    alert.read_at = data.read_at or datetime.utcnow()

    await db.flush()
    await db.refresh(alert)
    return alert


@internal_router.post("/", response_model=AlertRead, status_code=status.HTTP_201_CREATED)
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Crea un nuovo alert.
    Chiamato internamente dal servizio di alert processing (via MQTT event handler).
    """
    alert = Alert(
        user_id=data.user_id,
        event_id=data.event_id,
        severity=data.severity,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert