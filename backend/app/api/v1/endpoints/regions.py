from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.location import RegionService, DistrictService
from app.schemas.location import RegionRead, DistrictRead
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[RegionRead])
async def get_active_regions(search: str = None, db: AsyncSession = Depends(get_db)):
    """
    Get all active regions with their districts, with optional search.
    """
    return await RegionService.get_all(db, only_active=True, search=search)


@router.get("/districts", response_model=List[DistrictRead])
async def get_districts(
    region_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get active districts, optionally filtered by region_id.
    """
    return await DistrictService.get_all(
        db, region_id=region_id, is_active=True, search=search
    )
