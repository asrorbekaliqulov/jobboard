from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.core.logging_config import logger
from app.core.security import (
    create_access_token,
    get_current_user,
    verify_telegram_init_data,
    verify_telegram_widget_data,
)
from app.models.user import User, UserRole
from app.services.user import UserService
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession


def _get_redis():
    """Get Redis instance or None if not configured."""
    if settings.use_redis:
        from redis.asyncio import Redis
        return Redis.from_url(settings.REDIS_URL)
    return None

router = APIRouter()


class AuthRequest(BaseModel):
    initData: str


@router.post("/login")
async def login(auth_data: AuthRequest, db: AsyncSession = Depends(get_db)):
    user_data = verify_telegram_init_data(auth_data.initData)
    if not user_data:
        logger.warning(
            f"Failed login attempt - Invalid initData: {auth_data.initData[:50]}..."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram data"
        )

    telegram_id = str(user_data.get("id"))
    username = user_data.get("username")
    first_name = user_data.get("first_name")
    last_name = user_data.get("last_name")
    photo_url = user_data.get("photo_url")

    redis = _get_redis()
    user_service = UserService(db, redis)

    user = await user_service.get_user_by_telegram_id(telegram_id)

    add_data = {
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "photo_url": photo_url,
    }

    if not user:
        user = await user_service.create_user(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            photo_url=photo_url,
        )
    else:
        await user_service.update_user_login(user, add_data=add_data)

    access_token = create_access_token(data={"sub": str(telegram_id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url,
            "role": "admin" if user.is_admin else user.role,
            "language": user.language,
        },
    }


class WidgetAuthRequest(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


@router.post("/telegram-login")
async def telegram_login(
    auth_data: WidgetAuthRequest, db: AsyncSession = Depends(get_db)
):
    valid_data = verify_telegram_widget_data(auth_data.model_dump(exclude_none=True))
    if not valid_data:
        logger.warning(
            f"Failed widget login attempt - Invalid hash for user {auth_data.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram data"
        )

    telegram_id = str(valid_data.get("id"))
    username = valid_data.get("username")
    first_name = valid_data.get("first_name")
    last_name = valid_data.get("last_name")
    photo_url = valid_data.get("photo_url")

    redis = _get_redis()
    user_service = UserService(db, redis)

    user = await user_service.get_user_by_telegram_id(telegram_id)

    add_data = {
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "photo_url": photo_url,
    }

    if not user:
        user = await user_service.create_user(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            photo_url=photo_url,
        )
    else:
        await user_service.update_user_login(user, add_data=add_data)

    access_token = create_access_token(data={"sub": telegram_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "photo_url": user.photo_url,
            "role": "admin" if user.is_admin else user.role,
        },
    }


class RoleUpdateRequest(BaseModel):
    role: UserRole


@router.patch("/role")
async def update_role(
    role_data: RoleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        redis = _get_redis()
        user_service = UserService(db, redis)

        logger.info(f"Saving user role: {role_data.role.value} for user {current_user.telegram_id}")
        await user_service.save_role(current_user.telegram_id, role_data.role)
        return {"status": "ok", "role": role_data.role}
    except Exception as e:
        logger.error(f"Failed to save role: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save role: {str(e)}")


class LanguageUpdateRequest(BaseModel):
    language: str


@router.patch("/language")
async def update_language(
    lang_data: LanguageUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user's preferred language."""
    if lang_data.language not in ["en", "ru", "uz"]:
        raise HTTPException(status_code=400, detail="Invalid language code")

    try:
        redis = _get_redis()
        user_service = UserService(db, redis)
        await user_service.save_language(current_user.telegram_id, lang_data.language)
        return {"status": "ok", "language": lang_data.language}
    except Exception as e:
        logger.error(f"Failed to save language: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save language: {str(e)}")
