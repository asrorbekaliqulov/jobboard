from typing import List, Optional

from pydantic import BaseModel


class DistrictBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True


class DistrictCreate(DistrictBase):
    region_id: int


class DistrictUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    is_active: Optional[bool] = None
    region_id: Optional[int] = None


class RegionBase(BaseModel):
    name_uz: str
    name_ru: str
    name_en: str
    is_active: bool = True

    class Config:
        from_attributes = True


class DistrictRead(DistrictBase):
    id: int
    region_id: int
    region: RegionBase

    class Config:
        from_attributes = True


class DistrictList(BaseModel):
    items: List[DistrictRead]
    total: int

    class Config:
        from_attributes = True


class RegionCreate(RegionBase):
    pass


class RegionUpdate(BaseModel):
    name_uz: Optional[str] = None
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    is_active: Optional[bool] = None


class RegionRead(RegionBase):
    id: int
    districts_count: int = 0

    class Config:
        from_attributes = True


class RegionList(BaseModel):
    items: List[RegionRead]
    total: int

    class Config:
        from_attributes = True
