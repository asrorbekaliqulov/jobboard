"""
AI Resume Builder Service
Oddiy gaplardan professional rezyume yaratadi.
BARCHA maydonlarni to'ldiradi: ism, familiya, yosh, tajriba, kasb, telefon va h.k.
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
    """Generates professional resume from simple text - fills ALL fields."""

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
            f"Ishchi haqidagi matn: \"{request.simple_text}\"\n"
            f"Til: {target_lang}\n\n"
            f"Mavjud kasblar: {json.dumps(prof_list[:50], ensure_ascii=False)}\n\n"
            "Ushbu matndan BARCHA rezyume maydonlarini to'ldiring.\n"
            "MUHIM: 'professional_summary', 'experience_description' va 'formatted_resume_text' "
            "ni BIRINCHI SHAXSDA yoz (men, mening). Masalan: 'Men 5 yil elektrik bo'lib ishladim'. "
            "HECH QACHON uchinchi shaxsda (u, uning, ishlagan) yozma!\n"
            "Agar matnda ma'lumot bo'lmasa, mantiqiy taxmin qiling.\n\n"
            "Javob JSON formatda:\n"
            "{\n"
            '  "first_name": "Ism (matndan topilsa)",\n'
            '  "last_name": "Familiya (matndan topilsa)",\n'
            '  "age": raqam (matndan topilsa, yo\'qsa 25),\n'
            '  "experience": tajriba yillari raqam (0 agar aytilmasa),\n'
            '  "gender": "male" yoki "female" yoki "any",\n'
            '  "phone": "telefon raqam (matndan topilsa)" yoki null,\n'
            '  "telegram": "telegram username (matndan topilsa)" yoki null,\n'
            '  "suggested_profession_id": eng mos kasb ID raqam yoki null,\n'
            '  "suggested_profession_name": "Kasb nomi",\n'
            '  "professional_summary": "Professional qisqacha tavsif (2-3 jumla)",\n'
            '  "skills": ["konikma1", "konikma2", "konikma3"],\n'
            '  "experience_description": "Tajriba haqida batafsil (3-5 jumla)",\n'
            '  "formatted_resume_text": "Toliq professional rezyume matni (description uchun)"\n'
            "}\n\n"
            "MUHIM QOIDALAR:\n"
            "- formatted_resume_text — bu description maydoni uchun, professional va batafsil yoz (kamida 50 so'z)\n"
            "- Agar matnda ism/familiya bo'lmasa, null qo'y\n"
            "- Faqat berilgan ma'lumotlar asosida yoz, o'ylab qo'shma\n"
            "- Tajriba yillari raqam bo'lsin (masalan: 5)\n"
            "- gender: erkak bo'lsa 'male', ayol bo'lsa 'female', noaniq bo'lsa 'any'"
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
            # New fields for form auto-fill
            first_name=result.get("first_name"),
            last_name=result.get("last_name"),
            age=result.get("age"),
            experience=result.get("experience"),
            gender=result.get("gender"),
            phone=result.get("phone"),
            telegram=result.get("telegram"),
        )
