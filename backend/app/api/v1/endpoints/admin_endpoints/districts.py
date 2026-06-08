from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.location import DistrictService
from app.schemas.location import DistrictRead, DistrictCreate, DistrictUpdate, DistrictList
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=DistrictList)
async def list_districts(
    skip: int = 0,
    limit: int = 100,
    region_id: int = None, 
    search: Optional[str] = None, 
    is_active: bool | None = None, 
    db: AsyncSession = Depends(get_db)
):
    items = await DistrictService.get_all(db, region_id=region_id, is_active=is_active, search=search, skip=skip, limit=limit)
    total = await DistrictService.count(db, region_id=region_id, is_active=is_active, search=search)
    return {"items": items, "total": total}

@router.post("/", response_model=DistrictRead)
async def create_district(district_in: DistrictCreate, db: AsyncSession = Depends(get_db)):
    return await DistrictService.create(db, district_in)

@router.put("/{district_id}", response_model=DistrictRead)
async def update_district(district_id: int, district_in: DistrictUpdate, db: AsyncSession = Depends(get_db)):
    district = await DistrictService.get_by_id(db, district_id)
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    return await DistrictService.update(db, district, district_in)

@router.delete("/{district_id}")
async def delete_district(district_id: int, db: AsyncSession = Depends(get_db)):
    district = await DistrictService.get_by_id(db, district_id)
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    await DistrictService.delete(db, district)
    return {"detail": "District deleted"}
