from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.resume import ResumeStatus, Gender
from app.schemas.profession import ProfessionRead
from app.schemas.location import RegionRead
from app.schemas.user import UserRead


class ResumeBase(BaseModel):
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    age: int
    profession_id: int
    region_id: int
    gender: Gender
    experience: int
    description: str
    phone: str
    telegram: str
    email: Optional[EmailStr] = None
    portfolio: Optional[str] = None
    video: Optional[str] = None
    status: ResumeStatus = ResumeStatus.DRAFT


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
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
    email: Optional[EmailStr] = None
    portfolio: Optional[str] = None
    video: Optional[str] = None
    status: Optional[ResumeStatus] = None


class ResumeRead(ResumeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    viewed_count: int = 0

    user: Optional[UserRead] = None
    profession: Optional[ProfessionRead] = None
    region: Optional[RegionRead] = None

    class Config:
        from_attributes = True


class ResumeList(BaseModel):
    items: List[ResumeRead]
    total: int
