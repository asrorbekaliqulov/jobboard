from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from app.core.database import get_db
from app.services.work import WorkService
from app.schemas.daily_job_seeker import WorkCreate, WorkUpdate, WorkRead, WorkList

router = APIRouter()


@router.get("/", response_model=WorkList)
async def list_works(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: bool | None = None,
    parent_id: Optional[int] = None,
    top_level_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    items = await WorkService.get_all(db, only_active=is_active or False, search=search, skip=skip, limit=limit, parent_id=parent_id, top_level_only=top_level_only)
    total = await WorkService.count(db, only_active=is_active or False, search=search, parent_id=parent_id, top_level_only=top_level_only)
    return {"items": items, "total": total}


@router.get("/tree", response_model=List[WorkRead])
async def get_works_tree(db: AsyncSession = Depends(get_db)):
    """Get active works as tree (top-level with children)."""
    return await WorkService.get_tree(db, only_active=True)


@router.post("/", response_model=WorkRead)
async def create_work(work_in: WorkCreate, db: AsyncSession = Depends(get_db)):
    if work_in.parent_id:
        parent = await WorkService.get_by_id(db, work_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent work not found")
    return await WorkService.create(db, work_in)


@router.put("/{work_id}", response_model=WorkRead)
async def update_work(work_id: int, work_in: WorkUpdate, db: AsyncSession = Depends(get_db)):
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    if work_in.parent_id and work_in.parent_id == work_id:
        raise HTTPException(status_code=400, detail="Cannot be its own parent")
    return await WorkService.update(db, work, work_in)


@router.delete("/{work_id}")
async def delete_work(work_id: int, db: AsyncSession = Depends(get_db)):
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    await WorkService.delete(db, work)
    return {"detail": "Work deleted"}
