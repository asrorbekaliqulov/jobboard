from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.location import RegionService
from app.schemas.location import RegionRead, RegionCreate, RegionUpdate, RegionList
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=RegionList)
async def list_regions(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None, 
    is_active: bool | None = None, 
    db: AsyncSession = Depends(get_db)
):
    items = await RegionService.get_all(db, only_active=is_active, search=search, skip=skip, limit=limit)
    total = await RegionService.count(db, only_active=is_active, search=search)
    return {"items": items, "total": total}

@router.post("/", response_model=RegionRead)
async def create_region(region_in: RegionCreate, db: AsyncSession = Depends(get_db)):
    return await RegionService.create(db, region_in)

@router.put("/{region_id}", response_model=RegionRead)
async def update_region(region_id: int, region_in: RegionUpdate, db: AsyncSession = Depends(get_db)):
    region = await RegionService.get_by_id(db, region_id)
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    return await RegionService.update(db, region, region_in)

@router.delete("/{region_id}")
async def delete_region(region_id: int, db: AsyncSession = Depends(get_db)):
    region = await RegionService.get_by_id(db, region_id)
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    await RegionService.delete(db, region)
    return {"detail": "Region deleted"}
