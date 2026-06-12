from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.resume import Gender, ResumeStatus
from sqlalchemy import Column, Enum, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional

daily_job_seeker_works = Table(
    "daily_job_seeker_works",
    Base.metadata,
    Column(
        "daily_job_seeker_id",
        ForeignKey("daily_job_seekers.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("work_id", ForeignKey("works.id", ondelete="CASCADE"), primary_key=True),
)

daily_job_seeker_districts = Table(
    "daily_job_seeker_districts",
    Base.metadata,
    Column(
        "daily_job_seeker_id",
        ForeignKey("daily_job_seekers.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "district_id", ForeignKey("districts.id", ondelete="CASCADE"), primary_key=True
    ),
)


class Work(Base):
    __tablename__ = "works"

    id: Mapped[int] = mapped_column(primary_key=True)
    name_uz: Mapped[str] = mapped_column(String(255))
    name_ru: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    status: Mapped[bool] = mapped_column(default=True)

    # Parent/child hierarchy
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("works.id", ondelete="SET NULL"), nullable=True
    )
    parent: Mapped[Optional["Work"]] = relationship(
        "Work", remote_side="Work.id", back_populates="children", lazy="joined"
    )
    children: Mapped[list["Work"]] = relationship(
        "Work", back_populates="parent", lazy="selectin"
    )

    daily_job_seekers: Mapped[list["DailyJobSeeker"]] = relationship(
        secondary=daily_job_seeker_works,
        back_populates="works",
    )


class DailyJobSeeker(Base, TimestampMixin):
    __tablename__ = "daily_job_seekers"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    middle_name: Mapped[str | None] = mapped_column(String(255))
    age: Mapped[int] = mapped_column(Integer)
    profession_id: Mapped[int | None] = mapped_column(ForeignKey("professions.id"), nullable=True)
    region_id: Mapped[int] = mapped_column(ForeignKey("regions.id"))
    gender: Mapped[Gender] = mapped_column(Enum(Gender))
    experience: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(2000))
    phone: Mapped[str] = mapped_column(String(20))
    telegram: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    portfolio: Mapped[str | None] = mapped_column(String(255))
    video: Mapped[str | None] = mapped_column(String(255))
    additional_workers: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    status: Mapped[ResumeStatus] = mapped_column(
        Enum(ResumeStatus), default=ResumeStatus.DRAFT
    )
    viewed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    user: Mapped["User"] = relationship()
    profession: Mapped["Profession"] = relationship()
    region: Mapped["Region"] = relationship()
    districts: Mapped[list["District"]] = relationship(
        secondary=daily_job_seeker_districts,
    )
    works: Mapped[list[Work]] = relationship(
        secondary=daily_job_seeker_works,
        back_populates="daily_job_seekers",
    )
