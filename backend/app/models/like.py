"""
Like/Reaction model - separate from Favourites (bookmarks).
Likes are public counts, Favourites are private bookmarks.
"""
from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.base import TimestampMixin


class Like(Base, TimestampMixin):
    """
    Universal like table for vacancies and resumes.
    entity_type: 'vacancy' or 'resume'
    """
    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("user_id", "entity_type", "entity_id", name="uq_user_entity_like"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    entity_type: Mapped[str] = mapped_column(String(20))  # 'vacancy' or 'resume'
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
