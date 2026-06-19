"""
ISHKOP AI Chatbot Handler
GPT-4o multimodal bot: text + voice + image.
Function calling orqali bazadan mos vakansiya/ishchi topadi.
PDF resume yaratadi, kasb maslahat beradi.
"""
import json
import logging
import base64
from io import BytesIO
from typing import Optional

from aiogram import Router, F, types
from aiogram_i18n import I18nContext
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User, UserRole
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.resume import Resume, ResumeStatus
from app.models.profession import Profession

from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)
router = Router()

# ═══════════════════════════════════════════════════════════════
# SYSTEM PROMPT - ISHKOP Bot shaxsiyati
# ═══════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Sen ISHKOP - O'zbekistonning eng yirik mehnat bozori botisan.
Sen foydalanuvchilarga ish topish, ishchi qidirish va kasb maslahat berishda yordam berasan.

SENING VAZIFALARING:
1. Ish qidiruvchilarga mos vakansiyalar topish (search_vacancies funksiyasi)
2. Ish beruvchilarga mos ishchilar topish (search_workers funksiyasi)
3. Kasb maslahat berish (qaysi soha mos, maosh haqida)
4. ISHKOP platformasi haqida ma'lumot berish
5. Resume/CV yaratishda yordam

QOIDALAR:
- Har doim O'ZBEK tilida javob ber (agar user boshqa tilda yozmasa)
- Qisqa va aniq javob ber
- Agar user ish qidirsa — search_vacancies funksiyasini chaqir
- Agar user ishchi qidirsa — search_workers funksiyasini chaqir
- Agar user kasb maslahat so'rasa — tavsiyalar ber
- ISHKOP haqida so'ralsa: "ISHKOP — O'zbekistondagi eng yirik ish qidirish platformasi. 8000+ foydalanuvchi, 5000+ vakansiya."
- Doim do'stona va professional bo'l
- Agar aniq javob bera olmasang, "Iltimos, aniqroq yozing" de"""

# ═══════════════════════════════════════════════════════════════
# FUNCTION DEFINITIONS (OpenAI Function Calling)
# ═══════════════════════════════════════════════════════════════

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_vacancies",
            "description": "Bazadan vakansiyalar qidirish. Ish qidiruvchilar uchun. Kasb nomi, hudud yoki kalit so'z bo'yicha qidiradi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Qidiruv so'zi - kasb nomi yoki kalit so'z (masalan: 'dasturchi', 'oshpaz Toshkent')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Nechta natija qaytarish (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_workers",
            "description": "Bazadan ishchilar/resumelar qidirish. Ish beruvchilar uchun. Kasb nomi bo'yicha mos ishchilarni topadi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Qanday ishchi kerak (masalan: 'tajribali oshpaz', 'haydovchi')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Nechta natija (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_salary_info",
            "description": "Biror kasb bo'yicha bozordagi maosh ma'lumotlarini olish",
            "parameters": {
                "type": "object",
                "properties": {
                    "profession": {
                        "type": "string",
                        "description": "Kasb nomi"
                    }
                },
                "required": ["profession"]
            }
        }
    }
]

# ═══════════════════════════════════════════════════════════════
# FUNCTION IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════

async def fn_search_vacancies(query: str, limit: int = 5) -> str:
    """Search vacancies from database."""
    async with async_session_maker() as session:
        search_filter = f"%{query}%"

        # Find matching professions
        prof_result = await session.execute(
            select(Profession.id).where(
                Profession.is_active == True,
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )
        )
        profession_ids = [r[0] for r in prof_result.all()]

        # Search vacancies
        q = (
            select(Vacancy)
            .where(Vacancy.status == VacancyStatus.ACTIVE)
            .options(selectinload(Vacancy.profession), selectinload(Vacancy.region))
        )

        if profession_ids:
            q = q.where(or_(
                Vacancy.profession_id.in_(profession_ids),
                Vacancy.description.ilike(search_filter),
                Vacancy.company_name.ilike(search_filter),
            ))
        else:
            q = q.where(or_(
                Vacancy.description.ilike(search_filter),
                Vacancy.company_name.ilike(search_filter),
            ))

        result = await session.execute(q.order_by(Vacancy.created_at.desc()).limit(limit))
        vacancies = result.scalars().all()

        if not vacancies:
            return json.dumps({"found": 0, "message": "Vakansiya topilmadi"}, ensure_ascii=False)

        items = []
        for v in vacancies:
            salary = ""
            if v.salary_from and v.salary_till:
                salary = f"{v.salary_from:,}-{v.salary_till:,} so'm".replace(",", " ")
            elif v.salary_from:
                salary = f"{v.salary_from:,}+ so'm".replace(",", " ")
            items.append({
                "id": v.id,
                "kasb": v.profession.name_uz if v.profession else "—",
                "kompaniya": v.company_name,
                "hudud": v.region.name_uz if v.region else "—",
                "maosh": salary or "Kelishiladi",
                "tajriba": f"{v.exp_from}-{v.exp_till} yil",
                "telefon": v.phone,
            })
        return json.dumps({"found": len(items), "vacancies": items}, ensure_ascii=False)


async def fn_search_workers(query: str, limit: int = 5) -> str:
    """Search workers/resumes from database."""
    async with async_session_maker() as session:
        search_filter = f"%{query}%"

        prof_result = await session.execute(
            select(Profession.id).where(
                Profession.is_active == True,
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                )
            )
        )
        profession_ids = [r[0] for r in prof_result.all()]

        q = (
            select(Resume)
            .where(Resume.status == ResumeStatus.ACTIVE)
            .options(selectinload(Resume.profession), selectinload(Resume.region))
        )

        if profession_ids:
            q = q.where(or_(
                Resume.profession_id.in_(profession_ids),
                Resume.description.ilike(search_filter),
            ))
        else:
            q = q.where(Resume.description.ilike(search_filter))

        result = await session.execute(q.order_by(Resume.created_at.desc()).limit(limit))
        resumes = result.scalars().all()

        if not resumes:
            return json.dumps({"found": 0, "message": "Ishchi topilmadi"}, ensure_ascii=False)

        items = []
        for r in resumes:
            items.append({
                "id": r.id,
                "ism": f"{r.first_name} {r.last_name}",
                "kasb": r.profession.name_uz if r.profession else "—",
                "hudud": r.region.name_uz if r.region else "—",
                "tajriba": f"{r.experience} yil",
                "yosh": r.age,
                "telefon": r.phone,
            })
        return json.dumps({"found": len(items), "workers": items}, ensure_ascii=False)


async def fn_get_salary_info(profession: str) -> str:
    """Get salary info for a profession from database."""
    async with async_session_maker() as session:
        from sqlalchemy import func
        search_filter = f"%{profession}%"

        # Find profession
        prof_result = await session.execute(
            select(Profession.id).where(
                or_(Profession.name_uz.ilike(search_filter), Profession.name_ru.ilike(search_filter))
            ).limit(5)
        )
        prof_ids = [r[0] for r in prof_result.all()]

        if not prof_ids:
            return json.dumps({"error": f"'{profession}' kasbi topilmadi"}, ensure_ascii=False)

        # Get salary stats
        result = await session.execute(
            select(
                func.min(Vacancy.salary_from),
                func.max(Vacancy.salary_till),
                func.avg(Vacancy.salary_from),
                func.count(Vacancy.id),
            ).where(
                Vacancy.status == VacancyStatus.ACTIVE,
                Vacancy.profession_id.in_(prof_ids),
                Vacancy.salary_from.isnot(None),
            )
        )
        row = result.first()

        if not row or not row[3]:
            return json.dumps({"kasb": profession, "message": "Maosh ma'lumoti yetarli emas"}, ensure_ascii=False)

        return json.dumps({
            "kasb": profession,
            "min_maosh": int(row[0]) if row[0] else 0,
            "max_maosh": int(row[1]) if row[1] else 0,
            "ortacha": int(row[2]) if row[2] else 0,
            "vakansiyalar_soni": row[3],
        }, ensure_ascii=False)


# Function dispatcher
FUNCTION_MAP = {
    "search_vacancies": fn_search_vacancies,
    "search_workers": fn_search_workers,
    "get_salary_info": fn_get_salary_info,
}


# ═══════════════════════════════════════════════════════════════
# MAIN CHAT HANDLER
# ═══════════════════════════════════════════════════════════════

async def _get_user(telegram_id: str) -> Optional[User]:
    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()


async def _process_with_gpt4o(messages: list) -> str:
    """Send messages to GPT-4o with function calling."""
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0.4,
        max_tokens=1500,
    )

    message = response.choices[0].message

    # Handle function calls
    if message.tool_calls:
        # Execute functions
        messages.append(message)

        for tool_call in message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            fn = FUNCTION_MAP.get(fn_name)
            if fn:
                result = await fn(**fn_args)
            else:
                result = json.dumps({"error": "Unknown function"})

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

        # Get final response after function execution
        final_response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.4,
            max_tokens=1500,
        )
        return final_response.choices[0].message.content or ""

    return message.content or ""


def _get_webapp_url(query: str = "") -> str:
    import urllib.parse
    base = settings.MINI_APP_URL.rstrip("/")
    if query:
        return f"{base}?search={urllib.parse.quote(query)}"
    return base


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_message(message: types.Message, i18n: I18nContext):
    """Handle text messages - GPT-4o with function calling."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    try:
        role_context = ""
        if user.role == UserRole.CANDIDATE_HUNTER:
            role_context = "Foydalanuvchi ISH BERUVCHI - u ishchi qidiradi. search_workers funksiyasini ishlat."
        else:
            role_context = "Foydalanuvchi ISH QIDIRUVCHI - u vakansiya qidiradi. search_vacancies funksiyasini ishlat."

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + role_context},
            {"role": "user", "content": message.text},
        ]

        response_text = await _process_with_gpt4o(messages)

        # Add webapp button
        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[[
                types.InlineKeyboardButton(
                    text="📱 Ilovada ko'rish",
                    web_app=types.WebAppInfo(url=_get_webapp_url(message.text)),
                )
            ]]
        )

        # Split long messages
        if len(response_text) > 4000:
            for i in range(0, len(response_text), 4000):
                chunk = response_text[i:i+4000]
                if i + 4000 >= len(response_text):
                    await message.answer(chunk, reply_markup=webapp_kb, parse_mode="HTML")
                else:
                    await message.answer(chunk, parse_mode="HTML")
        else:
            await message.answer(response_text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"GPT-4o text error: {e}")
        await message.answer("❌ Xatolik yuz berdi. Qayta urinib ko'ring.")


@router.message(F.voice)
async def handle_voice_message(message: types.Message, i18n: I18nContext):
    """Handle voice messages - Whisper transcription + GPT-4o."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    status_msg = await message.answer("🎤 Ovozingiz tahlil qilinmoqda...")

    try:
        # Download and transcribe voice
        file = await message.bot.get_file(message.voice.file_id)
        voice_data = BytesIO()
        await message.bot.download_file(file.file_path, voice_data)
        voice_data.seek(0)
        voice_data.name = "voice.ogg"

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=voice_data,
        )

        text = transcription.text.strip()
        if not text:
            await status_msg.edit_text("🎤 Ovozingizni tushunib bo'lmadi.")
            return

        await status_msg.edit_text(f"🎤 \"{text}\"\n\n⏳ Javob tayyorlanmoqda...")

        # Process with GPT-4o
        role_context = ""
        if user.role == UserRole.CANDIDATE_HUNTER:
            role_context = "Foydalanuvchi ISH BERUVCHI. search_workers ishlat."
        else:
            role_context = "Foydalanuvchi ISH QIDIRUVCHI. search_vacancies ishlat."

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + role_context},
            {"role": "user", "content": text},
        ]

        response_text = await _process_with_gpt4o(messages)

        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[[
                types.InlineKeyboardButton(
                    text="📱 Ilovada ko'rish",
                    web_app=types.WebAppInfo(url=_get_webapp_url(text)),
                )
            ]]
        )

        await status_msg.edit_text(response_text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"GPT-4o voice error: {e}")
        await status_msg.edit_text("❌ Ovozli xabarni qayta ishlab bo'lmadi.")


@router.message(F.photo)
async def handle_photo_message(message: types.Message, i18n: I18nContext):
    """Handle photo messages - GPT-4o vision (resume/document analysis)."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    status_msg = await message.answer("🖼️ Rasm tahlil qilinmoqda...")

    try:
        # Download photo
        photo = message.photo[-1]  # Highest resolution
        file = await message.bot.get_file(photo.file_id)
        photo_data = BytesIO()
        await message.bot.download_file(file.file_path, photo_data)
        photo_data.seek(0)

        # Encode to base64
        image_base64 = base64.b64encode(photo_data.read()).decode("utf-8")

        caption = message.caption or "Bu rasmda nima bor? Agar bu resume/CV bo'lsa, undagi ma'lumotlarni o'qib ber."

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": caption},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                    }
                ]
            }
        ]

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=2000,
        )

        response_text = response.choices[0].message.content or "Rasmni tahlil qilib bo'lmadi."
        await status_msg.edit_text(response_text, parse_mode="HTML")

    except Exception as e:
        logger.error(f"GPT-4o photo error: {e}")
        await status_msg.edit_text("❌ Rasmni tahlil qilib bo'lmadi.")


@router.message(F.document)
async def handle_document_message(message: types.Message, i18n: I18nContext):
    """Handle document messages (PDF resume analysis)."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    # Only handle small documents
    if message.document.file_size > 5 * 1024 * 1024:
        await message.answer("❌ Fayl juda katta (max 5MB)")
        return

    await message.answer("📄 Hujjat qabul qilindi. Hozircha faqat matn va rasm bilan ishlay olaman. PDF tahlil qilish tez orada qo'shiladi!")
