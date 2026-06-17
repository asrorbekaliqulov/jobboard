"""
AI Voice Operator Service
Ovozli xabar matnidan e'lon yoki rezyume yaratadi.
Sheva so'zlarini standart tilga o'giradi.
"""
import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profession import Profession
from app.models.location import Region
from app.schemas.ai import AIVoiceOperatorRequest, AIVoiceOperatorResponse
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIVoiceOperatorService:
    """Converts transcribed voice messages into job postings or resumes."""

    @staticmethod
    async def process_voice_text(
        db: AsyncSession, request: AIVoiceOperatorRequest
    ) -> AIVoiceOperatorResponse:
        """
        Process transcribed voice text and generate structured content.
        Handles regional dialects and colloquial language.
        """
        # Get professions and regions for context
        prof_result = await db.execute(
            select(Profession).where(Profession.is_active == True).limit(50)
        )
        professions = prof_result.scalars().all()
        prof_list = [{"id": p.id, "name": p.name_uz} for p in professions]

        region_result = await db.execute(
            select(Region).where(Region.is_active == True)
        )
        regions = region_result.scalars().all()
        region_list = [{"id": r.id, "name": r.name_uz} for r in regions]

        prompt = (
            f"Ovozli xabardan aylantrilgan matn:\n\"{request.transcribed_text}\"\n\n"
            f"Foydalanuvchi niyati: {request.intent} (auto bo'lsa, o'zing aniqla)\n"
            f"Til: {request.language}\n\n"
            f"Mavjud kasblar: {json.dumps(prof_list[:30], ensure_ascii=False)}\n"
            f"Mavjud hududlar: {json.dumps(region_list, ensure_ascii=False)}\n\n"
            f"Vazifalar:\n"
            f"1. Sheva so'zlarini standart adabiy tilga o'gir\n"
            f"2. Bu vakansiya yoki rezyume ekanini aniqla\n"
            f"3. Tegishli strukturani to'ldir\n\n"
            f"Javob formati:\n"
            f"{{\n"
            f'  "detected_intent": "vacancy" yoki "resume",\n'
            f'  "confidence": 0.0-1.0,\n'
            f'  "cleaned_text": "Tozalangan standart matn",\n'
            f'  "generated_content": {{\n'
            f'    // Agar vacancy:\n'
            f'    "company_name": "...",\n'
            f'    "profession_id": ID yoki null,\n'
            f'    "description": "...",\n'
            f'    "salary_from": null yoki raqam,\n'
            f'    "salary_till": null yoki raqam,\n'
            f'    "phone": "..." yoki null,\n'
            f'    "region_id": ID yoki null\n'
            f'    // Agar resume:\n'
            f'    // "first_name": "...",\n'
            f'    // "profession_id": ID yoki null,\n'
            f'    // "experience": yillar,\n'
            f'    // "description": "...",\n'
            f'    // "phone": "..." yoki null\n'
            f"  }}\n"
            f"}}"
        )

        ai_response = await ai_chat_completion(
            feature="voice_operator",
            user_message=prompt,
            temperature=0.3,
        )
        result = parse_ai_json(ai_response)

        return AIVoiceOperatorResponse(
            detected_intent=result.get("detected_intent", "vacancy"),
            generated_content=result.get("generated_content", {}),
            confidence=result.get("confidence", 0.5),
            cleaned_text=result.get("cleaned_text", request.transcribed_text),
        )
