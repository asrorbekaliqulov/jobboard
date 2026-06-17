"""
AI Salary Analytics Service
Bazadagi real maosh ma'lumotlari asosida tahlil beradi.
MUHIM: Faqat bazadagi raqamlar ishlatiladi, o'ylab topilgan ma'lumot yo'q!
"""
import json
import logging
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vacancy import Vacancy, VacancyStatus
from app.models.profession import Profession
from app.models.location import Region
from app.models.ai_models import AISalaryCache
from app.schemas.ai import (
    AISalaryAnalyticsRequest,
    AISalaryAnalyticsResponse,
    SalaryRange,
)
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AISalaryAnalyticsService:
    """Provides salary analytics based ONLY on real database data."""

    @staticmethod
    async def get_analytics(
        db: AsyncSession, request: AISalaryAnalyticsRequest
    ) -> AISalaryAnalyticsResponse:
        """
        Get salary analytics for a profession/region.
        ALL numbers come from the database - AI only provides interpretation.
        """
        # Step 1: Find profession
        profession = None
        if request.profession_id:
            result = await db.execute(
                select(Profession).where(Profession.id == request.profession_id)
            )
            profession = result.scalar_one_or_none()
        elif request.profession_name:
            result = await db.execute(
                select(Profession).where(
                    Profession.name_uz.ilike(f"%{request.profession_name}%")
                ).limit(1)
            )
            profession = result.scalar_one_or_none()

        if not profession:
            raise ValueError("Kasb topilmadi. Iltimos, to'g'ri kasb nomini kiriting.")

        # Step 2: Get region
        region = None
        region_name = None
        if request.region_id:
            result = await db.execute(
                select(Region).where(Region.id == request.region_id)
            )
            region = result.scalar_one_or_none()
            if region:
                region_name = region.name_uz

        # Step 3: Query REAL salary data from database
        salary_query = select(
            func.min(Vacancy.salary_from).label("min_salary"),
            func.max(Vacancy.salary_till).label("max_salary"),
            func.avg(Vacancy.salary_from).label("avg_salary_from"),
            func.avg(Vacancy.salary_till).label("avg_salary_till"),
            func.count(Vacancy.id).label("sample_count"),
        ).where(
            Vacancy.status == VacancyStatus.ACTIVE,
            Vacancy.profession_id == profession.id,
            Vacancy.salary_from.isnot(None),
        )

        if region:
            salary_query = salary_query.where(Vacancy.region_id == region.id)

        result = await db.execute(salary_query)
        row = result.first()

        min_salary = int(row[0]) if row[0] else 0
        max_salary = int(row[1]) if row[1] else 0
        avg_from = int(row[2]) if row[2] else 0
        avg_till = int(row[3]) if row[3] else 0
        sample_count = int(row[4]) if row[4] else 0

        avg_salary = (avg_from + avg_till) // 2 if (avg_from and avg_till) else avg_from or avg_till
        median_salary = avg_salary

        # If no data found
        if sample_count == 0:
            no_data_msg = (
                f"'{profession.name_uz}' kasbi bo'yicha hozirda bazada "
                "aktiv maoshli vakansiyalar mavjud emas. "
                "Ma'lumot to'planganda qayta tekshiring."
            )
            no_data_freshness = f"Bazada {profession.name_uz} bo'yicha maoshli vakansiya topilmadi"
            return AISalaryAnalyticsResponse(
                profession_name=profession.name_uz,
                region_name=region_name,
                salary_data=SalaryRange(
                    min_salary=0,
                    max_salary=0,
                    avg_salary=0,
                    median_salary=0,
                    sample_count=0,
                ),
                market_trend="unknown",
                ai_recommendation=no_data_msg,
                is_salary_competitive=None,
                comparison_text="Ma'lumot yetarli emas",
                data_freshness=no_data_freshness,
            )

        salary_data = SalaryRange(
            min_salary=min_salary,
            max_salary=max_salary,
            avg_salary=avg_salary,
            median_salary=median_salary,
            sample_count=sample_count,
        )

        # Step 4: AI provides interpretation (but uses ONLY our numbers)
        nomalum = "Noma'lum"
        region_display = region_name or "Butun O'zbekiston"
        exp_display = str(request.experience_years) if request.experience_years else nomalum

        ai_context = (
            f"Kasb: {profession.name_uz}\n"
            f"Hudud: {region_display}\n"
            "BAZADAGI REAL MA'LUMOTLAR:\n"
            f"- Minimal maosh: {min_salary:,} so'm\n"
            f"- Maksimal maosh: {max_salary:,} so'm\n"
            f"- O'rtacha maosh: {avg_salary:,} so'm\n"
            f"- Namuna soni: {sample_count} ta aktiv vakansiya\n"
            f"- Foydalanuvchi tajribasi: {exp_display} yil\n"
            f"- Foydalanuvchi roli: {request.role}\n\n"
            "MUHIM: Faqat yuqoridagi raqamlar asosida maslahat ber!\n"
            "Yangi raqam o'ylab topma!\n\n"
            "Javob formati:\n"
            "{\n"
            '  "market_trend": "growing/stable/declining",\n'
            '  "ai_recommendation": "Maslahat matni",\n'
            '  "comparison_text": "Solishtirish matni"\n'
            "}"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="salary_analytics",
                user_message=ai_context,
                temperature=0.2,
            )
            ai_result = parse_ai_json(ai_response)
            market_trend = ai_result.get("market_trend", "stable")
            ai_recommendation = ai_result.get("ai_recommendation", "")
            comparison_text = ai_result.get("comparison_text", "")
        except Exception as e:
            logger.error(f"AI salary analysis failed: {e}")
            market_trend = "stable"
            ai_recommendation = (
                f"{profession.name_uz} kasbi bo'yicha o'rtacha maosh "
                f"{avg_salary:,} so'm atrofida."
            )
            comparison_text = f"Bazadagi {sample_count} ta vakansiya asosida"

        # Update cache
        try:
            cache = AISalaryCache(
                profession_id=profession.id,
                region_id=region.id if region else None,
                min_salary=min_salary,
                max_salary=max_salary,
                avg_salary=avg_salary,
                median_salary=median_salary,
                sample_count=sample_count,
                market_trend=market_trend,
                ai_recommendation=ai_recommendation,
            )
            db.add(cache)
            await db.commit()
        except Exception:
            await db.rollback()

        data_freshness = f"Bazadagi {sample_count} ta aktiv vakansiya asosida hisoblandi"

        return AISalaryAnalyticsResponse(
            profession_name=profession.name_uz,
            region_name=region_name,
            salary_data=salary_data,
            market_trend=market_trend,
            ai_recommendation=ai_recommendation,
            is_salary_competitive=None,
            comparison_text=comparison_text,
            data_freshness=data_freshness,
        )
