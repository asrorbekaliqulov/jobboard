from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List, Optional
from app.core.database import Base


class ProfessionCategory(Base):
    __tablename__ = "profession_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_ru: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)

    professions: Mapped[List["Profession"]] = relationship(back_populates="category")


class Profession(Base):
    __tablename__ = "professions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_ru: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("profession_categories.id"), nullable=True)
    category: Mapped[Optional["ProfessionCategory"]] = relationship(back_populates="professions")

    # Parent/child hierarchy
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("professions.id", ondelete="SET NULL"), nullable=True
    )
    parent: Mapped[Optional["Profession"]] = relationship(
        "Profession", remote_side="Profession.id", back_populates="children", lazy="joined"
    )
    children: Mapped[List["Profession"]] = relationship(
        "Profession", back_populates="parent", lazy="selectin"
    )
