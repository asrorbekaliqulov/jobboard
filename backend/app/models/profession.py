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
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("profession_categories.id", ondelete="SET NULL"), nullable=True
    )

    # Self-referential relationships
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

    professions: Mapped[List["Profession"]] = relationship(back_populates="category")


class Profession(Base):
    __tablename__ = "professions"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_ru: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("profession_categories.id"), nullable=True)
    category: Mapped["ProfessionCategory"] = relationship(back_populates="professions")
