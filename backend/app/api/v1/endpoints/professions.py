from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession import ProfessionService
from app.schemas.profession import ProfessionRead, ProfessionWithChildren
from typing import List, Optional

router = APIRouter()


@router.get("/", response_model=List[ProfessionRead])
async def get_active_professions(search: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """
    Get all active professions with optional search.
    """
    return await ProfessionService.get_all(db, only_active=True, search=search)


@router.get("/tree", response_model=List[ProfessionWithChildren])
async def get_professions_tree(db: AsyncSession = Depends(get_db)):
    """
    Get active professions as tree structure.
    Returns top-level professions (parent_id=null) with their children nested.
    """
    return await ProfessionService.get_tree(db, only_active=True)
