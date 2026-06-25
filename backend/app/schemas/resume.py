from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.resume import ResumeStatus, Gender
from app.schemas.profession import ProfessionRead
from app.schemas.location import RegionRead
from app.schemas.user import UserRead


def _empty_str_to_none(value):
    """Treat empty/whitespace strings as None.

    Legacy DB rows store email as "" (empty string) instead of NULL. Without this,
    serializing such a row into an EmailStr field raises a Pydantic validation
    error (HTTP 500), which the Mini App surfaces as "topilmadi".
    """
    if isinstance(value, str) and not value.strip():
        return None
    return value


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

    _normalize_email = field_validator("email", mode="before")(_empty_str_to_none)


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

    _normalize_email = field_validator("email", mode="before")(_empty_str_to_none)


class ResumeRead(ResumeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    viewed_count: int = 0

    # On read we only display stored data, so tolerate legacy/non-RFC values
    # (e.g. a phone number typed into the email box) instead of raising a 500.
    email: Optional[str] = None

    user: Optional[UserRead] = None
    profession: Optional[ProfessionRead] = None
    region: Optional[RegionRead] = None

    class Config:
        from_attributes = True


class ResumeList(BaseModel):
    items: List[ResumeRead]
    total: int
