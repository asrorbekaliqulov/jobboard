"""
AI Career Advisor Service
Yoshlarga kasb tanlashda yordam beradi - bazadagi real ma'lumotlar asosida.
"""
import json
import logging
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profession import Profession
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.location import Region
from app.schemas.ai import (
    AICareerAdvisorRequest,
    AICareerAdvisorResponse,
    CareerSuggestion,
)
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AICareerAdvisorService:
    """Provides career advice based on real market data from database."""

    @staticmethod
    async def get_advice(
        db: AsyncSession, request: AICareerAdvisorRequest
    ) -> AICareerAdvisorResponse:
        """
        Provide career recommendations based on user's profile and REAL market data.
        """
        # Step 1: Get profession list with vacancy counts
        prof_stats_query = (
            select(
                Profession.id,
                Profession.name_uz,
                func.count(Vacancy.id).label("vacancy_count"),
                func.avg(Vacancy.salary_from).label("avg_salary_from"),
                func.avg(Vacancy.salary_till).label("avg_salary_till"),
            )
            .outerjoin(Vacancy, (Vacancy.profession_id == Profession.id) & (Vacancy.status == VacancyStatus.ACTIVE))
            .where(Profession.is_active == True)
            .group_by(Profession.id, Profession.name_uz)
            .order_by(func.count(Vacancy.id).desc())
            .limit(50)
        )
        
        result = await db.execute(prof_stats_query)
        prof_stats = result.all()

        # Build context with real salary data
        market_data = []
        for row in prof_stats:
            entry = {
                "id": row[0],
                "name": row[1],
                "active_vacancies": row[2],
                "avg_salary_from": int(row[3]) if row[3] else None,
                "avg_salary_till": int(row[4]) if row[4] else None,
            }
            market_data.append(entry)

        # Get region name
        region_name = None
        if request.region_id:
            region_result = await db.execute(
                select(Region).where(Region.id == request.region_id)
            )
            region = region_result.scalar_one_or_none()
            if region:
                region_name = region.name_uz

        lang_map = {"uz": "o'zbek", "ru": "rus", "en": "ingliz"}
        target_lang = lang_map.get(request.language, "o'zbek")

        nomalum = "Noma'lum"
        education = request.education_level or nomalum
        skills_text = ", ".join(request.current_skills) if request.current_skills else "Yo'q"
        region_display = region_name or "Butun O'zbekiston"

        prompt = (
            f"Foydalanuvchi ma'lumotlari:\n"
            f"- Yosh: {request.age}\n"
            f"- Qiziqishlar: {', '.join(request.interests)}\n"
            f"- Ta'lim: {education}\n"
            f"- Mavjud ko'nikmalar: {skills_text}\n"
            f"- Hudud: {region_display}\n\n"
            f"BAZADAGI REAL BOZOR MA'LUMOTLARI:\n"
            f"{json.dumps(market_data, ensure_ascii=False)}\n\n"
            "MUHIM: Faqat yuqoridagi bazadagi raqamlar asosida maslahat ber!\n"
            "Maosh haqida gapirganingda, faqat bazadagi avg_salary_from/till raqamlarini ishlatib ayt.\n"
            "Agar biror kasb bo'yicha maosh ma'lumoti null bo'lsa, 'Ma'lumot yetarli emas' de.\n\n"
            "3-5 ta eng mos kasbni tavsiya qil.\n"
            f"Til: {target_lang}\n\n"
            "Javob formati:\n"
            "{\n"
            '  "suggestions": [\n'
            '    {\n'
            '      "profession_name": "Kasb nomi",\n'
            '      "profession_id": ID yoki null,\n'
            '      "match_reason": "Nima uchun mos",\n'
            '      "estimated_salary_from": raqam yoki null,\n'
            '      "estimated_salary_till": raqam yoki null,\n'
            '      "growth_potential": "high/medium/low",\n'
            '      "how_to_start": "Qayerdan boshlash kerak",\n'
            '      "required_skills": ["skill1", "skill2"]\n'
            '    }\n'
            '  ],\n'
            '  "general_advice": "Umumiy maslahat",\n'
            '  "market_overview": "Ozbekiston bozori haqida qisqacha"\n'
            "}"
        )

        ai_response = await ai_chat_completion(
            feature="career_advisor",
            user_message=prompt,
            temperature=0.4,
        )
        result_data = parse_ai_json(ai_response)

        suggestions = []
        for s in result_data.get("suggestions", []):
            suggestions.append(CareerSuggestion(
                profession_name=s.get("profession_name", ""),
                profession_id=s.get("profession_id"),
                match_reason=s.get("match_reason", ""),
                estimated_salary_from=s.get("estimated_salary_from"),
                estimated_salary_till=s.get("estimated_salary_till"),
                growth_potential=s.get("growth_potential", "medium"),
                how_to_start=s.get("how_to_start", ""),
                required_skills=s.get("required_skills", []),
            ))

        return AICareerAdvisorResponse(
            suggestions=suggestions,
            general_advice=result_data.get("general_advice", ""),
            market_overview=result_data.get("market_overview", ""),
        )
