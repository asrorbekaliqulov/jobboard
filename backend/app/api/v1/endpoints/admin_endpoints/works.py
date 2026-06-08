from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
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
    db: AsyncSession = Depends(get_db),
):
    items = await WorkService.get_all(db, only_active=is_active or False, search=search, skip=skip, limit=limit)
    total = await WorkService.count(db, only_active=is_active or False, search=search)
    return {"items": items, "total": total}


@router.post("/", response_model=WorkRead)
async def create_work(work_in: WorkCreate, db: AsyncSession = Depends(get_db)):
    return await WorkService.create(db, work_in)


@router.put("/{work_id}", response_model=WorkRead)
async def update_work(work_id: int, work_in: WorkUpdate, db: AsyncSession = Depends(get_db)):
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return await WorkService.update(db, work, work_in)


@router.delete("/{work_id}")
async def delete_work(work_id: int, db: AsyncSession = Depends(get_db)):
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    await WorkService.delete(db, work)
    return {"detail": "Work deleted"}
