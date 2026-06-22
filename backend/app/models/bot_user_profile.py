"""
Bot User Profile - stores info the user shares with the bot during chat.
SEPARATE table - does NOT touch existing users/resumes tables.
Used to pre-fill resume/vacancy forms without re-asking.
Only saved when user voluntarily provides info.
"""
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin


class BotUserProfile(Base, TimestampMixin):
    """Collected user info from bot conversations (for form pre-fill)."""
    __tablename__ = "bot_user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    # Personal info (only filled if user shares it)
    first_name: Mapped[str | None] = mapped_column(String(255))
    last_name: Mapped[str | None] = mapped_column(String(255))
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(20))
    telegram: Mapped[str | None] = mapped_column(String(255))

    # Professional info
    profession: Mapped[str | None] = mapped_column(String(255))
    experience_years: Mapped[int | None] = mapped_column(Integer)
    skills: Mapped[str | None] = mapped_column(Text)  # comma-separated
    region: Mapped[str | None] = mapped_column(String(255))
    about: Mapped[str | None] = mapped_column(Text)  # free description

    # Employer info
    company_name: Mapped[str | None] = mapped_column(String(255))
