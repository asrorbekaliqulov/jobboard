from pydantic import BaseModel
from typing import Optional


class ProfessionCategoryBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True
    professions_count: int = 0


class ProfessionCategoryCreate(ProfessionCategoryBase):
    pass


class ProfessionCategoryUpdate(ProfessionCategoryBase):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    is_active: Optional[bool] = None


class ProfessionCategoryRead(ProfessionCategoryBase):
    id: int

    class Config:
        from_attributes = True


class ProfessionCategoryList(BaseModel):
    items: list[ProfessionCategoryRead]
    total: int
