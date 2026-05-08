import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class ModuleType(str, enum.Enum):
    FALL = "fall"
    INTRUSION = "intrusion"
    CROWD = "crowd"
    VEHICLE = "vehicle"
    FIRE = "fire"


class VideoQuality(str, enum.Enum):
    Q360P = "360p"
    Q720P = "720p"
    Q1080P = "1080p"


class CameraStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ALERT = "alert"


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    module_type: Mapped[ModuleType] = mapped_column(
        Enum(ModuleType, name="module_type_enum"), nullable=False
    )
    default_quality: Mapped[VideoQuality] = mapped_column(
        Enum(VideoQuality, name="video_quality_enum"),
        default=VideoQuality.Q720P,
        nullable=False,
    )
    status: Mapped[CameraStatus] = mapped_column(
        Enum(CameraStatus, name="camera_status_enum"),
        default=CameraStatus.OFFLINE,
        nullable=False,
    )
    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relazioni
    owner: Mapped["User"] = relationship("User", back_populates="cameras")
    events: Mapped[list["Event"]] = relationship(
        "Event", back_populates="camera", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Camera {self.name} ({self.status})>"