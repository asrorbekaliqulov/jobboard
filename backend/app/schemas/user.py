from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, UserLanguage

class UserBase(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[UserLanguage] = None
    role: Optional[UserRole] = None
    is_active: bool = True
    is_blocked: bool = False
    is_admin: bool = False

class UserCreate(UserBase):
    telegram_id: str    

class UserUpdate(UserBase):
    telegram_id: Optional[str] = None

class UserRead(UserBase):
    id: int
    telegram_id: Optional[str] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserList(BaseModel):
    items: list[UserRead]
    total: int