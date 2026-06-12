from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession import ProfessionService
from app.schemas.profession import (
    ProfessionRead,
    ProfessionCreate,
    ProfessionUpdate,
    ProfessionList,
)
from typing import Optional

router = APIRouter()


@router.get("/", response_model=ProfessionList)
async def list_professions(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    parent_id: Optional[int] = None,
    top_level_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List professions with optional filters.
    - parent_id: filter to get children of a specific profession
    - top_level_only: if true, only get root professions (no parent)
    """
    items = await ProfessionService.get_all(
        db, only_active=is_active, search=search,
        parent_id=parent_id, top_level_only=top_level_only,
        skip=skip, limit=limit,
    )
    total = await ProfessionService.count(
        db, only_active=is_active, search=search,
        parent_id=parent_id, top_level_only=top_level_only,
    )
    return {"items": items, "total": total}


@router.post("/", response_model=ProfessionRead)
async def create_profession(
    profession_in: ProfessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a profession. Set parent_id to make it a sub-profession."""
    if profession_in.parent_id is not None:
        parent = await ProfessionService.get_by_id(db, profession_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent profession not found")
    return await ProfessionService.create(db, profession_in)


@router.put("/{profession_id}", response_model=ProfessionRead)
async def update_profession(
    profession_id: int,
    profession_in: ProfessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    profession = await ProfessionService.get_by_id(db, profession_id)
    if not profession:
        raise HTTPException(status_code=404, detail="Profession not found")
    # Prevent circular reference
    if profession_in.parent_id is not None:
        if profession_in.parent_id == profession_id:
            raise HTTPException(status_code=400, detail="Profession cannot be its own parent")
        parent = await ProfessionService.get_by_id(db, profession_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent profession not found")
        if parent.parent_id == profession_id:
            raise HTTPException(status_code=400, detail="Circular reference detected")
    return await ProfessionService.update(db, profession, profession_in)


@router.delete("/{profession_id}")
async def delete_profession(
    profession_id: int,
    db: AsyncSession = Depends(get_db),
):
    profession = await ProfessionService.get_by_id(db, profession_id)
    if not profession:
        raise HTTPException(status_code=404, detail="Profession not found")
    await ProfessionService.delete(db, profession)
    return {"detail": "Profession deleted"}
