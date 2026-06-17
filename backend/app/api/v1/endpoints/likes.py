"""
Like/Reaction endpoints.
Toggle like on vacancies and resumes. Returns like count.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.like import Like

logger = logging.getLogger(__name__)
router = APIRouter()


class LikeResponse(BaseModel):
    liked: bool
    like_count: int


class LikeStatusResponse(BaseModel):
    liked: bool
    like_count: int


@router.post("/toggle/{entity_type}/{entity_id}", response_model=LikeResponse)
async def toggle_like(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Like/Unlike a vacancy or resume.
    entity_type: 'vacancy' or 'resume'
    """
    if entity_type not in ("vacancy", "resume"):
        raise HTTPException(status_code=400, detail="entity_type 'vacancy' yoki 'resume' bo'lishi kerak")

    # Check if already liked
    existing = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.entity_type == entity_type,
            Like.entity_id == entity_id,
        )
    )
    existing_like = existing.scalar_one_or_none()

    if existing_like:
        # Unlike
        await db.delete(existing_like)
        await db.commit()
        liked = False
    else:
        # Like
        new_like = Like(
            user_id=current_user.id,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.add(new_like)
        await db.commit()
        liked = True

    # Get total count
    count_result = await db.execute(
        select(func.count(Like.id)).where(
            Like.entity_type == entity_type,
            Like.entity_id == entity_id,
        )
    )
    like_count = count_result.scalar_one() or 0

    return LikeResponse(liked=liked, like_count=like_count)


@router.get("/status/{entity_type}/{entity_id}", response_model=LikeStatusResponse)
async def get_like_status(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if current user liked an entity and get total count."""
    if entity_type not in ("vacancy", "resume"):
        raise HTTPException(status_code=400, detail="entity_type 'vacancy' yoki 'resume' bo'lishi kerak")

    # Check user's like
    existing = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.entity_type == entity_type,
            Like.entity_id == entity_id,
        )
    )
    liked = existing.scalar_one_or_none() is not None

    # Total count
    count_result = await db.execute(
        select(func.count(Like.id)).where(
            Like.entity_type == entity_type,
            Like.entity_id == entity_id,
        )
    )
    like_count = count_result.scalar_one() or 0

    return LikeStatusResponse(liked=liked, like_count=like_count)


@router.get("/count/{entity_type}/{entity_id}")
async def get_like_count(
    entity_type: str,
    entity_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get like count (no auth required)."""
    count_result = await db.execute(
        select(func.count(Like.id)).where(
            Like.entity_type == entity_type,
            Like.entity_id == entity_id,
        )
    )
    return {"like_count": count_result.scalar_one() or 0}
