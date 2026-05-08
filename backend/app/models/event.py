import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    camera_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    # Relazioni
    camera: Mapped["Camera"] = relationship("Camera", back_populates="events")
    media_clips: Mapped[list["MediaClip"]] = relationship(
        "MediaClip", back_populates="event", cascade="all, delete-orphan"
    )
    alerts: Mapped[list["Alert"]] = relationship(
        "Alert", back_populates="event", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Event {self.event_type} @ {self.camera_id}>"