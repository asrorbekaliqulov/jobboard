import enum
from datetime import datetime

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import BigInteger, Boolean, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column


class UserLanguage(str, enum.Enum):
    UZ = "uz"
    RU = "ru"
    EN = "en"


class UserRole(str, enum.Enum):
    JOB_SEEKER = "job_seeker"
    CANDIDATE_HUNTER = "candidate_hunter"
    DAILY_JOB_SEEKER = "daily_job_seeker"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    telegram_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str | None] = mapped_column(String(255))
    last_name: Mapped[str | None] = mapped_column(String(255))
    photo_url: Mapped[str | None] = mapped_column(String(1200))
    phone: Mapped[str | None] = mapped_column(String(20))
    language: Mapped[UserLanguage | None] = mapped_column(Enum(UserLanguage))
    role: Mapped[UserRole | None] = mapped_column(Enum(UserRole))
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
