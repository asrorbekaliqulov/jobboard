"""
HeadHunter API Endpoints
Fetches and displays vacancies from HeadHunter.uz
These are shown with a distinct reddish border to indicate external source.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ai import HHVacancyItem, HHVacancyListResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/vacancies", response_model=HHVacancyListResponse)
async def get_hh_vacancies(
    query: Optional[str] = Query(None, description="Qidiruv so'zi (kasb nomi, kalit so'z)"),
    page: int = Query(0, ge=0, description="Sahifa raqami (0 dan boshlanadi)"),
    per_page: int = Query(20, ge=1, le=50, description="Har sahifada nechta"),
    salary_from: Optional[int] = Query(None, description="Minimal maosh"),
    salary_to: Optional[int] = Query(None, description="Maksimal maosh"),
    experience: Optional[str] = Query(
        None,
        description="Tajriba: noExperience, between1And3, between3And6, moreThan6"
    ),
):
    """
    HeadHunter.uz dan vakansiyalar ro'yxati.
    
    Bu vakansiyalar tashqi manbadan olingan va qizg'ish border bilan ko'rsatiladi.
    Asosiy vakansiyalar bazadagi ichki vakansiyalar hisoblanadi.
    """
    try:
        from app.services.headhunter import HeadHunterService
        result = await HeadHunterService.search_vacancies(
            query=query,
            page=page,
            per_page=per_page,
            salary_from=salary_from,
            salary_to=salary_to,
            experience=experience,
        )
        return result
    except Exception as e:
        logger.error(f"HeadHunter API error: {e}")
        # Return empty result instead of error (graceful degradation)
        return HHVacancyListResponse(
            items=[], total=0, page=page, per_page=per_page
        )


@router.get("/vacancies/{vacancy_id}")
async def get_hh_vacancy_detail(
    vacancy_id: str,
):
    """
    HeadHunter.uz dan bitta vakansiya tafsilotlari.
    """
    try:
        from app.services.headhunter import HeadHunterService
        detail = await HeadHunterService.get_vacancy_detail(vacancy_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Vakansiya topilmadi")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HH vacancy detail error: {e}")
        raise HTTPException(status_code=503, detail="HeadHunter xizmati vaqtincha ishlamayapti")


@router.get("/search-similar", response_model=HHVacancyListResponse)
async def search_similar_on_hh(
    query: str = Query(..., min_length=2, description="Qidiruv matni"),
    limit: int = Query(10, ge=1, le=30),
):
    """
    Bazadagi vakansiyaga o'xshash HH vakansiyalarini qidirish.
    AI orqali foydalanuvchiga qo'shimcha variantlar taklif qilish uchun.
    """
    try:
        from app.services.headhunter import HeadHunterService
        return await HeadHunterService.get_similar_vacancies(query, limit)
    except Exception as e:
        logger.error(f"HH similar search error: {e}")
        return HHVacancyListResponse(items=[], total=0, page=0, per_page=limit)
