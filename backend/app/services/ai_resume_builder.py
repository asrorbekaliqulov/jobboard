"""
AI Resume Builder Service
Oddiy gaplardan professional rezyume yaratadi.
"""
import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profession import Profession
from app.schemas.ai import AIResumeBuilderRequest, AIResumeBuilderResponse
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIResumeBuilderService:
    """Generates professional resume from simple text."""

    @staticmethod
    async def build_resume(
        db: AsyncSession, request: AIResumeBuilderRequest
    ) -> AIResumeBuilderResponse:
        """Build a professional resume from simple text description."""
        
        # Get professions for matching
        prof_result = await db.execute(
            select(Profession).where(Profession.is_active == True)
        )
        professions = prof_result.scalars().all()
        prof_list = [{"id": p.id, "name": p.name_uz} for p in professions[:100]]

        lang_map = {"uz": "o'zbek", "ru": "rus", "en": "ingliz"}
        target_lang = lang_map.get(request.language, "o'zbek")

        prompt = (
            f"Ishchi haqidagi oddiy matn: \"{request.simple_text}\"\n"
            f"Til: {target_lang}\n\n"
            f"Mavjud kasblar: {json.dumps(prof_list[:50], ensure_ascii=False)}\n\n"
            "Ushbu matndan professional rezyume yozing.\n"
            "Javob JSON formatda:\n"
            "{\n"
            '  "professional_summary": "Professional qisqacha tavsif (2-3 jumla)",\n'
            '  "skills": ["konikma1", "konikma2"],\n'
            '  "experience_description": "Tajriba haqida batafsil",\n'
            '  "suggested_profession_id": null yoki ID raqam,\n'
            '  "suggested_profession_name": "Kasb nomi",\n'
            '  "formatted_resume_text": "Toliq tayyor rezyume matni"\n'
            "}\n\n"
            "Rezyume professional, aniq va ishonchli bo'lsin. "
            "Faqat berilgan ma'lumotlar asosida yoz, o'ylab qo'shma."
        )

        ai_response = await ai_chat_completion(
            feature="resume_builder",
            user_message=prompt,
            temperature=0.3,
        )
        result = parse_ai_json(ai_response)

        return AIResumeBuilderResponse(
            professional_summary=result.get("professional_summary", ""),
            skills=result.get("skills", []),
            experience_description=result.get("experience_description", ""),
            suggested_profession_id=result.get("suggested_profession_id"),
            suggested_profession_name=result.get("suggested_profession_name"),
            formatted_resume_text=result.get("formatted_resume_text", ""),
        )
