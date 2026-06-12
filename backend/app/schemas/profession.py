from typing import Optional, List

from pydantic import BaseModel


class ProfessionBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True
    parent_id: Optional[int] = None


class ProfessionCreate(ProfessionBase):
    pass


class ProfessionUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    is_active: Optional[bool] = None
    parent_id: Optional[int] = None


class ProfessionRead(ProfessionBase):
    id: int

    class Config:
        from_attributes = True


class ProfessionWithChildren(ProfessionRead):
    """Profession with nested children for tree display."""
    children: List["ProfessionRead"] = []

    class Config:
        from_attributes = True


class ProfessionList(BaseModel):
    items: list[ProfessionRead]
    total: int
