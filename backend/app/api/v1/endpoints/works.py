from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.work import WorkService
from app.schemas.daily_job_seeker import WorkCreate, WorkUpdate, WorkRead, WorkList

router = APIRouter()


@router.get("/", response_model=WorkList)
async def list_works(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    works = await WorkService.get_all(db, skip=skip, limit=limit, only_active=not current_user.is_admin, search=search)
    total = await WorkService.count(db, only_active=not current_user.is_admin, search=search)
    return WorkList(items=works, total=total)


@router.get("/{work_id}", response_model=WorkRead)
async def get_work(
    work_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    if not current_user.is_admin and not work.status:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@router.post("/", response_model=WorkRead, status_code=status.HTTP_201_CREATED)
async def create_work(
    work_in: WorkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admin can create work")
    return await WorkService.create(db, work_in)


@router.put("/{work_id}", response_model=WorkRead)
async def update_work(
    work_id: int,
    work_in: WorkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admin can update work")
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return await WorkService.update(db, work, work_in)


@router.delete("/{work_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work(
    work_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admin can delete work")
    work = await WorkService.get_by_id(db, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    await WorkService.delete(db, work)
    return {}
