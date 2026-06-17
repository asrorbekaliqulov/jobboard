"""
AI Job Post Writer Service
Oddiy matnlarni professional vakansiya e'loniga aylantiradi.
"""
import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profession import Profession
from app.models.location import Region
from app.schemas.ai import AIJobPostWriterRequest, AIJobPostWriterResponse
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIJobPostWriterService:
    """Generates professional job postings from simple text input."""

    @staticmethod
    async def generate_post(
        db: AsyncSession, request: AIJobPostWriterRequest
    ) -> AIJobPostWriterResponse:
        """Generate a professional job posting from simple text."""
        
        # Get professions for matching
        prof_result = await db.execute(
            select(Profession).where(Profession.is_active == True)
        )
        professions = prof_result.scalars().all()
        prof_list = [{"id": p.id, "name": p.name_uz} for p in professions[:100]]

        # Get region name if provided
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
        company = request.company_name or nomalum
        region_display = region_name or nomalum

        prompt = (
            f"Oddiy matn: \"{request.simple_text}\"\n"
            f"Kompaniya: {company}\n"
            f"Hudud: {region_display}\n"
            f"Til: {target_lang}\n\n"
            f"Mavjud kasblar: {json.dumps(prof_list[:50], ensure_ascii=False)}\n\n"
            "Ushbu oddiy matndan professional vakansiya e'lonini yozing.\n"
            "Javob JSON formatda:\n"
            "{\n"
            '  "title": "Lavozim nomi",\n'
            '  "description": "Toliq elon matni (Talablar, Vazifalar, Sharoit, Ish vaqti kiritilsin)",\n'
            '  "suggested_salary_from": null yoki raqam (som),\n'
            '  "suggested_salary_till": null yoki raqam (som),\n'
            '  "suggested_requirements": ["talab1", "talab2"],\n'
            '  "suggested_work_hours": 8 yoki 9 yoki 10 yoki 12,\n'
            '  "suggested_schedule": "5/2" yoki "6/1" yoki "7/0",\n'
            '  "suggested_profession_id": null yoki ID raqam\n'
            "}\n\n"
            "E'lon matni professional, aniq va qisqa bo'lsin. "
            "Maosh haqida ishonchsiz bo'lsangiz null qo'ying."
        )

        ai_response = await ai_chat_completion(
            feature="job_post_writer",
            user_message=prompt,
            temperature=0.4,
        )
        result = parse_ai_json(ai_response)

        return AIJobPostWriterResponse(
            title=result.get("title", "Vakansiya"),
            description=result.get("description", ""),
            suggested_salary_from=result.get("suggested_salary_from"),
            suggested_salary_till=result.get("suggested_salary_till"),
            suggested_requirements=result.get("suggested_requirements", []),
            suggested_work_hours=result.get("suggested_work_hours"),
            suggested_schedule=result.get("suggested_schedule"),
            suggested_profession_id=result.get("suggested_profession_id"),
        )
