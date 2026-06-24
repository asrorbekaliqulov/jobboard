"""Pydantic schemas for userbot management (admin)."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------- Channels ----------
class UserbotChannelBase(BaseModel):
    channel_identifier: str
    keywords: Optional[str] = None
    is_active: bool = True


class UserbotChannelCreate(UserbotChannelBase):
    pass


class UserbotChannelUpdate(BaseModel):
    channel_identifier: Optional[str] = None
    keywords: Optional[str] = None
    is_active: Optional[bool] = None


class UserbotChannelRead(UserbotChannelBase):
    id: int
    account_id: int
    channel_title: Optional[str] = None
    channel_username: Optional[str] = None
    channel_photo_url: Optional[str] = None
    last_message_id: Optional[int] = None
    imported_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------- Accounts ----------
class UserbotAccountBase(BaseModel):
    name: str
    phone: str
    api_id: int
    api_hash: str


class UserbotAccountCreate(UserbotAccountBase):
    pass


class UserbotAccountUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    api_id: Optional[int] = None
    api_hash: Optional[str] = None
    is_active: Optional[bool] = None


class UserbotAccountRead(BaseModel):
    id: int
    name: str
    phone: str
    api_id: int
    status: str
    is_active: bool
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    channels: List[UserbotChannelRead] = []

    class Config:
        from_attributes = True


class UserbotAccountList(BaseModel):
    items: List[UserbotAccountRead]
    total: int


# ---------- Auth flow ----------
class SendCodeRequest(BaseModel):
    pass


class VerifyCodeRequest(BaseModel):
    code: str
    password: Optional[str] = None  # 2FA password if enabled


class ActionResult(BaseModel):
    success: bool
    status: str
    message: str = ""
