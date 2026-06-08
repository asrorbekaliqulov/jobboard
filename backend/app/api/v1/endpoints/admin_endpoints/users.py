from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.user import UserService
from app.schemas.user import UserRead, UserCreate, UserUpdate, UserList
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=UserList)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_blocked: Optional[bool] = None,
    filter_role: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    user_service = UserService(db)
    users = await user_service.get_all(
        skip=skip,
        limit=limit,
        search=search,
        is_active=is_active,
        is_blocked=is_blocked,
    )
    total = await user_service.count(
        search=search,
        is_active=is_active,
        is_blocked=is_blocked,
    )
    return UserList(items=users, total=total)


@router.post("/", response_model=UserRead)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    # Check if telegram_id exists
    existing = await user_service.get_user_by_telegram_id(user_in.telegram_id)
    if existing:
        raise HTTPException(status_code=400, detail="User with this Telegram ID already exists")
    return await user_service.create(user_in)

@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, user_in: UserUpdate, db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await user_service.update(user, user_in)

@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user_service = UserService(db)
    user = await user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user_service.delete(user)
    return {"detail": "User deleted"}
