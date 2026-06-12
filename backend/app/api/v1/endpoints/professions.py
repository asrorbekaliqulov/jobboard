from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession import ProfessionService
from app.schemas.profession import ProfessionRead, ProfessionWithChildren
from typing import List, Optional

router = APIRouter()


@router.get("/", response_model=List[ProfessionRead])
async def get_active_professions(
    search: Optional[str] = None,
    parent_id: Optional[int] = None,
    top_level_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Get all active professions with optional search and hierarchy filters.
    - search: filter by name
    - parent_id: get children of a specific profession
    - top_level_only: only get root professions (no parent)
    """
    return await ProfessionService.get_all(
        db, only_active=True, search=search,
        parent_id=parent_id, top_level_only=top_level_only,
    )


@router.get("/tree", response_model=List[ProfessionWithChildren])
async def get_professions_tree(db: AsyncSession = Depends(get_db)):
    """
    Get all active professions as a tree structure.
    Returns top-level professions with their active children nested.
    Used by the frontend for category display and filtering.
    """
    return await ProfessionService.get_tree(db, only_active=True)
