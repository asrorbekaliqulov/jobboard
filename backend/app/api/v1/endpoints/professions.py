from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession import ProfessionService
from app.schemas.profession import ProfessionRead
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ProfessionRead])
async def get_active_professions(search: str = None, db: AsyncSession = Depends(get_db)):
    """
    Get all active professions with optional search.
    """
    return await ProfessionService.get_all(db, only_active=True, search=search)
