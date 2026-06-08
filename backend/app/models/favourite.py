from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class FavouriteVacancy(Base, TimestampMixin):
    __tablename__ = "favourite_vacancies"

    id: Mapped[int] = mapped_column(primary_key=True)
    vacancy_id: Mapped[int] = mapped_column(ForeignKey("vacancies.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    vacancy: Mapped["Vacancy"] = relationship()
    user: Mapped["User"] = relationship()

class FavouriteResume(Base, TimestampMixin):
    __tablename__ = "favourite_resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    resume_id: Mapped[int] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    resume: Mapped["Resume"] = relationship()
    user: Mapped["User"] = relationship()


class FavouriteDailyJobSeeker(Base, TimestampMixin):
    __tablename__ = "favourite_daily_job_seekers"

    id: Mapped[int] = mapped_column(primary_key=True)
    daily_job_seeker_id: Mapped[int] = mapped_column(ForeignKey("daily_job_seekers.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    daily_job_seeker: Mapped["DailyJobSeeker"] = relationship()
    user: Mapped["User"] = relationship()
