from pydantic import BaseModel
from typing import Optional, List


class ProfessionCategoryBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True
    parent_id: Optional[int] = None


class ProfessionCategoryCreate(ProfessionCategoryBase):
    pass


class ProfessionCategoryUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    is_active: Optional[bool] = None
    parent_id: Optional[int] = None


class ProfessionCategoryRead(ProfessionCategoryBase):
    id: int
    professions_count: int = 0

    class Config:
        from_attributes = True


class ProfessionCategoryWithChildren(ProfessionCategoryRead):
    """Category with nested children for hierarchical display."""
    children: List["ProfessionCategoryRead"] = []

    class Config:
        from_attributes = True


class ProfessionCategoryTree(BaseModel):
    """Top-level categories with their subcategories for the frontend tree view."""
    id: int
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True
    parent_id: Optional[int] = None
    professions_count: int = 0
    children: List["ProfessionCategoryRead"] = []

    class Config:
        from_attributes = True


class ProfessionCategoryList(BaseModel):
    items: list[ProfessionCategoryRead]
    total: int


class ProfessionCategoryTreeList(BaseModel):
    """List of top-level categories with their subcategories."""
    items: list[ProfessionCategoryTree]
    total: int
