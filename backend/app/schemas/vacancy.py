from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.vacancy import VacancyStatus, WorkFormat, WorkType, WorkSchedule
from app.schemas.profession import ProfessionRead
from app.schemas.location import RegionRead
from app.schemas.user import UserRead


def _empty_str_to_none(value):
    """Treat empty/whitespace strings as None.

    Legacy DB rows store email as "" (empty string) instead of NULL. Without this,
    serializing such a row into an EmailStr field raises a Pydantic validation
    error (HTTP 500), which the Mini App surfaces as "vakansiya topilmadi".
    """
    if isinstance(value, str) and not value.strip():
        return None
    return value


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

    _normalize_email = field_validator("email", mode="before")(_empty_str_to_none)


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

    _normalize_email = field_validator("email", mode="before")(_empty_str_to_none)


class VacancyRead(VacancyBase):
    id: int
    user_id: int
    viewed_count: int
    created_at: datetime
    updated_at: datetime

    # Source info (set when imported by userbot from a Telegram channel)
    source_type: Optional[str] = None
    source_url: Optional[str] = None
    source_channel: Optional[str] = None

    profession: Optional[ProfessionRead] = None
    region: Optional[RegionRead] = None
    user: Optional[UserRead] = None

    class Config:
        from_attributes = True


class VacancyList(BaseModel):
    items: List[VacancyRead]
    total: int
