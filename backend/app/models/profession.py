from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.core.database import Base


class ProfessionCategory(Base):
    """Legacy table - kept for backward compatibility with existing data."""
    __tablename__ = "profession_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_ru: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("profession_categories.id", ondelete="SET NULL"), nullable=True
    )

    parent: Mapped[Optional["ProfessionCategory"]] = relationship(
        "ProfessionCategory",
        remote_side="ProfessionCategory.id",
        back_populates="children",
        lazy="joined",
    )
    children: Mapped[List["ProfessionCategory"]] = relationship(
        "ProfessionCategory",
        back_populates="parent",
        lazy="selectin",
    )

    professions: Mapped[List["Profession"]] = relationship(
        back_populates="category", foreign_keys="Profession.category_id"
    )


class Profession(Base):
    __tablename__ = "professions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_ru: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)

    # Legacy FK to profession_categories (kept for data safety)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("profession_categories.id"), nullable=True)
    category: Mapped[Optional["ProfessionCategory"]] = relationship(
        back_populates="professions", foreign_keys=[category_id]
    )

    # Self-referential parent/child hierarchy for professions
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("professions.id", ondelete="SET NULL"), nullable=True
    )

    parent: Mapped[Optional["Profession"]] = relationship(
        "Profession",
        remote_side="Profession.id",
        back_populates="children",
        lazy="joined",
    )
    children: Mapped[List["Profession"]] = relationship(
        "Profession",
        back_populates="parent",
        lazy="selectin",
    )
