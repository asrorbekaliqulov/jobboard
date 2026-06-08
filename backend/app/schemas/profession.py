from typing import Optional

from pydantic import BaseModel


class ProfessionBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True


class ProfessionCreate(ProfessionBase):
    pass


class ProfessionUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    is_active: Optional[bool] = None


class ProfessionRead(ProfessionBase):
    id: int

    class Config:
        from_attributes = True


class ProfessionList(BaseModel):
    items: list[ProfessionRead]
    total: int
