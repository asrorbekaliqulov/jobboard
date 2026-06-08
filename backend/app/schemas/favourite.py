from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.vacancy import VacancyRead
from app.schemas.resume import ResumeRead
from app.schemas.daily_job_seeker import DailyJobSeekerRead


class FavouriteVacancyCreate(BaseModel):
    vacancy_id: int

class FavouriteResumeCreate(BaseModel):
    resume_id: int

class FavouriteDailyJobSeekerCreate(BaseModel):
    daily_job_seeker_id: int

class FavouriteCreate(BaseModel):
    vacancy_id: Optional[int] = None
    resume_id: Optional[int] = None


class FavouriteVacancyRead(BaseModel):
    id: int
    vacancy_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    vacancy: Optional[VacancyRead] = None

    class Config:
        from_attributes = True

class FavouriteResumeRead(BaseModel):
    id: int
    resume_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    resume: Optional[ResumeRead] = None

    class Config:
        from_attributes = True

class FavouriteDailyJobSeekerRead(BaseModel):
    id: int
    daily_job_seeker_id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    daily_job_seeker: Optional[DailyJobSeekerRead] = None

    class Config:
        from_attributes = True

class FavouriteVacancyList(BaseModel):
    vacancies: list[FavouriteVacancyRead]
    total: int

class FavouriteResumeList(BaseModel):
    resumes: list[FavouriteResumeRead]
    total: int

class FavouriteDailyJobSeekerList(BaseModel):
    daily_job_seekers: list[FavouriteDailyJobSeekerRead]
    total: int