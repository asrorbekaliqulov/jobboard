from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.resume import ResumeStatus
from app.models.user import User
from app.schemas.daily_job_seeker import (
    DailyJobSeekerCreate,
    DailyJobSeekerList,
    DailyJobSeekerRead,
    DailyJobSeekerUpdate,
)
from app.services.daily_job_seeker import DailyJobSeekerService
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=DailyJobSeekerList)
async def list_daily_job_seekers(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    profession_id: Optional[int] = None,
    region_id: Optional[int] = None,
    status: Optional[ResumeStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_status = status
    if not current_user.is_admin and user_id is None and status is None:
        effective_status = ResumeStatus.ACTIVE

    items = await DailyJobSeekerService.get_all(
        db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        profession_id=profession_id,
        region_id=region_id,
        status=effective_status,
        search=search,
    )
    total = await DailyJobSeekerService.count(
        db,
        user_id=user_id,
        profession_id=profession_id,
        region_id=region_id,
        status=effective_status,
        search=search,
    )
    return DailyJobSeekerList(items=items, total=total)


@router.get("/{daily_job_seeker_id}", response_model=DailyJobSeekerRead)
async def get_daily_job_seeker(
    daily_job_seeker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = await DailyJobSeekerService.get_by_id(db, daily_job_seeker_id)
    if not item:
        raise HTTPException(status_code=404, detail="Daily job seeker not found")
    if (
        not current_user.is_admin
        and item.status != ResumeStatus.ACTIVE
        and item.user_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Daily job seeker not found")
    return item


@router.post(
    "/", response_model=DailyJobSeekerRead, status_code=status.HTTP_201_CREATED
)
async def create_daily_job_seeker(
    daily_job_seeker_in: DailyJobSeekerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new daily job seeker profile. Any authenticated user can create their own profile."""
    return await DailyJobSeekerService.create(
        db, daily_job_seeker_in, user_id=current_user.id
    )


@router.put("/{daily_job_seeker_id}", response_model=DailyJobSeekerRead)
async def update_daily_job_seeker(
    daily_job_seeker_id: int,
    daily_job_seeker_in: DailyJobSeekerUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a daily job seeker profile. Users can update their own profiles, admins can update any."""
    item = await DailyJobSeekerService.get_by_id(db, daily_job_seeker_id)
    if not item:
        raise HTTPException(status_code=404, detail="Daily job seeker not found")

    # Allow if admin or if user owns the profile
    if not current_user.is_admin and item.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only update your own profile"
        )

    return await DailyJobSeekerService.update(db, item, daily_job_seeker_in)


@router.delete("/{daily_job_seeker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_daily_job_seeker(
    daily_job_seeker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a daily job seeker profile. Users can delete their own profiles, admins can delete any."""
    item = await DailyJobSeekerService.get_by_id(db, daily_job_seeker_id)
    if not item:
        raise HTTPException(status_code=404, detail="Daily job seeker not found")

    # Allow if admin or if user owns the profile
    if not current_user.is_admin and item.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own profile"
        )

    await DailyJobSeekerService.delete(db, item)
    return {}


@router.post("/{daily_job_seeker_id}/view", status_code=status.HTTP_200_OK)
async def register_view(
    daily_job_seeker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a view for a daily job seeker profile."""
    item = await DailyJobSeekerService.get_by_id(db, daily_job_seeker_id)
    if not item:
        raise HTTPException(status_code=404, detail="Daily job seeker not found")

    # Don't count views for own profile
    if item.user_id != current_user.id:
        await DailyJobSeekerService.increment_view_count(db, item)

    return {"status": "ok", "viewed_count": item.viewed_count}
