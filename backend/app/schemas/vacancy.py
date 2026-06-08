from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.vacancy import VacancyStatus, WorkFormat, WorkType, WorkSchedule
from app.schemas.profession import ProfessionRead
from app.schemas.location import RegionRead
from app.schemas.user import UserRead


class VacancyBase(BaseModel):
    company_name: str
    profession_id: int
    region_id: int
    status: VacancyStatus = VacancyStatus.DRAFT
    description: str
    work_format: WorkFormat
    work_type: WorkType
    work_hours: int
    phone: str
    telegram: str
    email: Optional[EmailStr] = None
    schedule: WorkSchedule
    exp_from: int
    exp_till: int
    salary_from: Optional[int] = None
    salary_till: Optional[int] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class VacancyCreate(VacancyBase):
    pass


class VacancyUpdate(BaseModel):
    company_name: Optional[str] = None
    profession_id: Optional[int] = None
    region_id: Optional[int] = None
    status: Optional[VacancyStatus] = None
    description: Optional[str] = None
    work_format: Optional[WorkFormat] = None
    work_type: Optional[WorkType] = None
    work_hours: Optional[int] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    email: Optional[EmailStr] = None
    schedule: Optional[WorkSchedule] = None
    exp_from: Optional[int] = None
    exp_till: Optional[int] = None
    salary_from: Optional[int] = None
    salary_till: Optional[int] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class VacancyRead(VacancyBase):
    id: int
    user_id: int
    viewed_count: int
    created_at: datetime
    updated_at: datetime
    
    profession: Optional[ProfessionRead] = None
    region: Optional[RegionRead] = None
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True


class VacancyList(BaseModel):
    items: List[VacancyRead]
    total: int
