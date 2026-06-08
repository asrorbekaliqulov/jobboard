from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.analytics import AnalyticsService
from app.core.config import settings
from redis.asyncio import Redis

router = APIRouter()

async def get_analytics_service():
    redis = Redis.from_url(settings.REDIS_URL)
    return AnalyticsService(redis)

@router.post("/vacancies/{id}/view")
async def view_vacancy(
    id: int,
    current_user: User = Depends(get_current_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    await service.register_view('vacancy', id, current_user.id)
    return {"status": "ok"}

@router.post("/resumes/{id}/view")
async def view_resume(
    id: int,
    current_user: User = Depends(get_current_user),
    service: AnalyticsService = Depends(get_analytics_service)
):
    await service.register_view('resume', id, current_user.id)
    return {"status": "ok"}
