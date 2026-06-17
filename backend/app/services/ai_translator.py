"""
AI Regional Translator & Dialect Filter Service
Rus tilidan o'zbek tiliga tarjima + viloyat shevalarini standart tilga o'girish.
"""
import logging
from typing import Optional

from app.schemas.ai import AITranslatorRequest, AITranslatorResponse
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AITranslatorService:
    """Translates text and normalizes regional dialects."""

    @staticmethod
    async def translate(request: AITranslatorRequest) -> AITranslatorResponse:
        """
        Translate text between languages and clean up dialects.
        Supports: uz, ru, en
        """
        lang_names = {"uz": "o'zbek", "ru": "rus", "en": "ingliz", "auto": "avtomatik"}
        source_lang = lang_names.get(request.source_language, "avtomatik")
        target_lang = lang_names.get(request.target_language, "o'zbek")

        clean_dialect_text = "Ha" if request.clean_dialect else "Yo'q"

        prompt = (
            f"Matn: \"{request.text}\"\n"
            f"Manba tili: {source_lang}\n"
            f"Maqsad tili: {target_lang}\n"
            f"Sheva tozalash: {clean_dialect_text}\n\n"
        )

        if request.clean_dialect:
            prompt += (
                "Qo'shimcha vazifalar:\n"
                "1. Viloyat shevasi so'zlarini standart adabiy tilga o'gir\n"
                "2. O'zgartirilgan so'zlarni ro'yxat qil\n"
                "Masalan: 'kel' -> 'keling', 'qayoqqa' -> 'qayerga', 'buvam' -> 'bobom'\n\n"
            )

        prompt += (
            "Javob formati:\n"
            "{\n"
            '  "translated_text": "Tarjima qilingan/tozalangan matn",\n'
            '  "detected_language": "uz/ru/en",\n'
            '  "dialect_corrections": [\n'
            '    {"original": "sheva sozi", "corrected": "standart soz"}\n'
            '  ],\n'
            '  "confidence": 0.0-1.0\n'
            "}"
        )

        ai_response = await ai_chat_completion(
            feature="translator",
            user_message=prompt,
            temperature=0.2,
        )
        result = parse_ai_json(ai_response)

        return AITranslatorResponse(
            translated_text=result.get("translated_text", request.text),
            detected_language=result.get("detected_language", "uz"),
            dialect_corrections=result.get("dialect_corrections"),
            confidence=result.get("confidence", 0.8),
        )
