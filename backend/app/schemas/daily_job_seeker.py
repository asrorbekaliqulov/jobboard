from datetime import datetime
from typing import List, Optional

from app.models.resume import Gender, ResumeStatus
from app.schemas.location import DistrictRead, RegionRead
from app.schemas.profession import ProfessionRead
from app.schemas.user import UserRead
from pydantic import BaseModel


class WorkBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    status: bool = True


class WorkCreate(WorkBase):
    pass


class WorkUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    status: Optional[bool] = None


class WorkRead(WorkBase):
    id: int

    class Config:
        from_attributes = True


class DailyJobSeekerBase(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    age: int
    profession_id: Optional[int] = None
    region_id: int
    gender: Gender
    experience: int
    description: str
    phone: str
    telegram: str
    email: Optional[str] = None
    portfolio: Optional[str] = None
    video: Optional[str] = None
    additional_workers: int = 0
    status: ResumeStatus = ResumeStatus.DRAFT
    work_ids: List[int] = []
    district_ids: List[int] = []


class DailyJobSeekerCreate(DailyJobSeekerBase):
    pass


class DailyJobSeekerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    age: Optional[int] = None
    profession_id: Optional[int] = None
    region_id: Optional[int] = None
    gender: Optional[Gender] = None
    experience: Optional[int] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    email: Optional[str] = None
    portfolio: Optional[str] = None
    video: Optional[str] = None
    additional_workers: Optional[int] = None
    status: Optional[ResumeStatus] = None
    work_ids: Optional[List[int]] = None
    district_ids: Optional[List[int]] = None


class DailyJobSeekerRead(BaseModel):
    id: int
    user_id: int
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    age: int
    profession_id: Optional[int] = None
    region_id: int
    gender: Gender
    experience: int
    description: str
    phone: str
    telegram: str
    email: Optional[str] = None
    portfolio: Optional[str] = None
    video: Optional[str] = None
    additional_workers: int = 0
    status: ResumeStatus
    viewed_count: int = 0
    created_at: datetime
    updated_at: datetime

    user: Optional[UserRead] = None
    profession: Optional[ProfessionRead] = None
    region: Optional[RegionRead] = None
    districts: List[DistrictRead] = []
    works: List[WorkRead] = []

    class Config:
        from_attributes = True


class DailyJobSeekerList(BaseModel):
    items: List[DailyJobSeekerRead]
    total: int


class WorkList(BaseModel):
    items: List[WorkRead]
    total: int
