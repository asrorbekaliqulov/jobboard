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
    async def _get_related_profession_ids(
        db: AsyncSession, profession: Profession
    ) -> list[int]:
        """
        Yaqin kasblarning id larini topadi (maosh namunasini ko'paytirish uchun).
        Tartib: bir xil parent ostidagi aka-uka kasblar + bolalari,
        bo'lmasa bir xil kategoriyadagi kasblar.
        Har doim asosiy kasbning o'zi ham ro'yxatda bo'ladi.
        """
        ids: set[int] = {profession.id}

        # 1) Parent/child ierarxiyasi bo'yicha aka-uka kasblar
        # parent_id mavjud bo'lsa -> bir xil parent ostidagilar; aks holda o'zining bolalari
        anchor_parent = profession.parent_id or profession.id
        try:
            sib_result = await db.execute(
                select(Profession.id).where(
                    (Profession.parent_id == anchor_parent)
                    | (Profession.id == anchor_parent)
                    | (Profession.parent_id == profession.id)
                )
            )
            ids.update(r[0] for r in sib_result.all())
        except Exception as e:  # pragma: no cover
            logger.warning(f"Sibling lookup by parent failed: {e}")

        # 2) Hali ham kam bo'lsa, bir xil kategoriyadagi kasblar
        if profession.category_id:
            try:
                cat_result = await db.execute(
                    select(Profession.id).where(
                        Profession.category_id == profession.category_id
                    )
                )
                ids.update(r[0] for r in cat_result.all())
            except Exception as e:  # pragma: no cover
                logger.warning(f"Sibling lookup by category failed: {e}")

        return list(ids)

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

        # Step 3: Query REAL salary data from database.
        # MUHIM: kamida 20 ta vakansiyaga qarashga harakat qilamiz.
        # Agar aniq kasb bo'yicha 20 tadan kam bo'lsa, bir xil
        # kategoriya/parent ostidagi yaqin kasblarni ham qo'shamiz.
        MIN_SAMPLES = 20

        def _build_salary_query(profession_ids):
            q = select(
                func.min(Vacancy.salary_from).label("min_salary"),
                func.max(Vacancy.salary_till).label("max_salary"),
                func.avg(Vacancy.salary_from).label("avg_salary_from"),
                func.avg(Vacancy.salary_till).label("avg_salary_till"),
                func.count(Vacancy.id).label("sample_count"),
            ).where(
                Vacancy.status == VacancyStatus.ACTIVE,
                Vacancy.salary_from.isnot(None),
            )
            if len(profession_ids) == 1:
                q = q.where(Vacancy.profession_id == profession_ids[0])
            else:
                q = q.where(Vacancy.profession_id.in_(profession_ids))
            if region:
                q = q.where(Vacancy.region_id == region.id)
            return q

        # 3a: avval aniq kasb bo'yicha
        result = await db.execute(_build_salary_query([profession.id]))
        row = result.first()
        sample_count = int(row[4]) if row[4] else 0
        broadened = False

        # 3b: agar 20 tadan kam bo'lsa, yaqin kasblarni qo'shamiz
        if sample_count < MIN_SAMPLES:
            sibling_ids = await AISalaryAnalyticsService._get_related_profession_ids(
                db, profession
            )
            if len(sibling_ids) > 1:
                result = await db.execute(_build_salary_query(sibling_ids))
                broadened_row = result.first()
                broadened_count = int(broadened_row[4]) if broadened_row[4] else 0
                # Faqat ko'proq namuna topilsa, kengaytirilgan natijani olamiz
                if broadened_count > sample_count:
                    row = broadened_row
                    sample_count = broadened_count
                    broadened = True

        min_salary = int(row[0]) if row[0] else 0
        max_salary = int(row[1]) if row[1] else 0
        avg_from = int(row[2]) if row[2] else 0
        avg_till = int(row[3]) if row[3] else 0

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
            f"- Namuna soni: {sample_count} ta aktiv vakansiya"
            + (" (shu jumladan yaqin kasblar)" if broadened else "")
            + "\n"
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

        data_freshness = (
            f"Bazadagi {sample_count} ta aktiv vakansiya asosida hisoblandi"
            + (" (yaqin kasblar ham hisobga olindi)" if broadened else "")
        )

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
