"""
AI Search Bot Handler
Uses AI Agent Search for smart results + HeadHunter fallback.
- Text: AI analyzes → searches by profession → ranks results
- Voice: Whisper transcription → same AI search
- If nothing found: searches HeadHunter API as fallback
"""
import logging
from aiogram import Router, F, types
from aiogram_i18n import I18nContext

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User, UserRole

from sqlalchemy import select

logger = logging.getLogger(__name__)
router = Router()


async def _get_user(telegram_id: str):
    """Get user from database."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()


async def _agent_search(query: str, role: str, limit: int = 5) -> dict:
    """Run AI Agent Search."""
    from app.services.ai_agent_search import AIAgentSearchService
    async with async_session_maker() as session:
        return await AIAgentSearchService.search(
            db=session,
            query=query,
            role=role,
            limit=limit,
        )


async def _hh_fallback_search(query: str, limit: int = 5) -> list:
    """Search HeadHunter as fallback when no local results."""
    try:
        from app.services.headhunter import HeadHunterService
        result = await HeadHunterService.search_vacancies(query=query, per_page=limit)
        return result.items
    except Exception as e:
        logger.error(f"HH fallback search failed: {e}")
        return []


def _format_result(item: dict, index: int) -> str:
    """Format a single search result for Telegram message."""
    title = item.get("title", "—")
    subtitle = item.get("subtitle", "")
    region = item.get("region", "")
    score = item.get("score", 0)
    phone = item.get("phone", "")
    salary = item.get("salary", "")
    experience = item.get("experience", "")

    lines = [f"<b>{index}. {title}</b>"]
    if subtitle:
        lines[0] += f"\n   🏢 {subtitle}"
    parts = []
    if region:
        parts.append(f"📍 {region}")
    if salary:
        parts.append(f"💰 {salary} so'm")
    if experience:
        parts.append(f"🧠 {experience}")
    if parts:
        lines.append("   " + " | ".join(parts))
    if phone:
        lines.append(f"   📞 {phone}")
    if score > 0:
        lines.append(f"   ✅ Moslik: {score}%")

    return "\n".join(lines)


def _format_hh_result(item, index: int) -> str:
    """Format HeadHunter vacancy for Telegram."""
    salary_text = ""
    if item.salary_from and item.salary_till:
        salary_text = f"{item.salary_from:,} - {item.salary_till:,}".replace(",", " ")
    elif item.salary_from:
        salary_text = f"{item.salary_from:,}+".replace(",", " ")
    elif item.salary_till:
        salary_text = f"{item.salary_till:,} gacha".replace(",", " ")

    lines = [f"<b>{index}. {item.title}</b> 🌐"]
    lines.append(f"   🏢 {item.company_name}")
    parts = []
    if item.region:
        parts.append(f"📍 {item.region}")
    if salary_text:
        parts.append(f"💰 {salary_text} {item.salary_currency}")
    if parts:
        lines.append("   " + " | ".join(parts))
    lines.append(f"   🔗 <a href='{item.url}'>hh.uz da ko'rish</a>")

    return "\n".join(lines)


def _get_webapp_url(query: str) -> str:
    """Generate webapp URL with search query."""
    import urllib.parse
    base = settings.MINI_APP_URL.rstrip("/")
    encoded_query = urllib.parse.quote(query)
    return f"{base}?search={encoded_query}"


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_search(message: types.Message, i18n: I18nContext):
    """Handle text message as job search. Uses AI Agent Search."""
    query = message.text.strip()
    if len(query) < 2:
        return

    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    try:
        role = user.role.value if user.role else "job_seeker"

        # Run AI Agent Search
        result = await _agent_search(query, role, limit=5)
        items = result.get("items", [])

        if items:
            # Format results
            search_type_label = "vakansiya" if result.get("search_type") == "vacancy" else "ishchi"
            header = f"🤖 <b>\"{query}\"</b> bo'yicha {len(items)} ta {search_type_label} topildi:\n"
            formatted = [_format_result(item, i + 1) for i, item in enumerate(items)]
            text = header + "\n\n".join(formatted)
        else:
            # Fallback: HeadHunter search
            hh_items = await _hh_fallback_search(query, limit=5)
            if hh_items:
                header = f"📋 <b>\"{query}\"</b> — bazada topilmadi.\n\n🌐 HeadHunter.uz dan {len(hh_items)} ta vakansiya:\n"
                formatted = [_format_hh_result(item, i + 1) for i, item in enumerate(hh_items)]
                text = header + "\n\n".join(formatted)
            else:
                text = (
                    f"😕 <b>\"{query}\"</b> bo'yicha natija topilmadi.\n\n"
                    "💡 Maslahat:\n"
                    "• Kasb nomini aniqroq yozing (masalan: \"oshpaz\", \"haydovchi\")\n"
                    "• Qisqaroq so'z ishlating"
                )

        # WebApp button
        webapp_url = _get_webapp_url(query)
        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [types.InlineKeyboardButton(
                    text="📱 Ilovada barchasini ko'rish",
                    web_app=types.WebAppInfo(url=webapp_url),
                )]
            ]
        )
        await message.answer(text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"Bot search error: {e}")
        await message.answer("❌ Qidiruvda xatolik. Keyinroq urinib ko'ring.")


@router.message(F.voice)
async def handle_voice_search(message: types.Message, i18n: I18nContext):
    """Handle voice messages - Whisper transcription then AI Agent search."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("🎤 Ovozli qidiruv hozirda ishlamayapti.")
        return

    status_msg = await message.answer("🎤 Ovoz tahlil qilinmoqda...")

    try:
        # Download voice
        voice = message.voice
        file = await message.bot.get_file(voice.file_id)

        from io import BytesIO
        voice_data = BytesIO()
        await message.bot.download_file(file.file_path, voice_data)
        voice_data.seek(0)

        # Transcribe with Whisper (auto-detect language)
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        voice_data.name = "voice.ogg"
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=voice_data,
        )

        transcribed_text = transcription.text.strip()
        if not transcribed_text:
            await status_msg.edit_text("🎤 Ovozingizni tushunib bo'lmadi. Qayta urinib ko'ring.")
            return

        await status_msg.edit_text(f"🎤 <b>\"{transcribed_text}\"</b>\n\n🔍 Qidirmoqda...", parse_mode="HTML")

        # AI Agent Search
        role = user.role.value if user.role else "job_seeker"
        result = await _agent_search(transcribed_text, role, limit=5)
        items = result.get("items", [])

        if items:
            search_type_label = "vakansiya" if result.get("search_type") == "vacancy" else "ishchi"
            header = f"🎤 <b>\"{transcribed_text}\"</b> — {len(items)} ta {search_type_label}:\n"
            formatted = [_format_result(item, i + 1) for i, item in enumerate(items)]
            text = header + "\n\n".join(formatted)
        else:
            # HH fallback
            hh_items = await _hh_fallback_search(transcribed_text, limit=5)
            if hh_items:
                header = f"🎤 <b>\"{transcribed_text}\"</b>\n\n🌐 HeadHunter.uz dan {len(hh_items)} ta:\n"
                formatted = [_format_hh_result(item, i + 1) for i, item in enumerate(hh_items)]
                text = header + "\n\n".join(formatted)
            else:
                text = f"😕 <b>\"{transcribed_text}\"</b> bo'yicha natija topilmadi."

        webapp_url = _get_webapp_url(transcribed_text)
        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [types.InlineKeyboardButton(
                    text="📱 Ilovada barchasini ko'rish",
                    web_app=types.WebAppInfo(url=webapp_url),
                )]
            ]
        )
        await status_msg.edit_text(text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"Voice search error: {e}")
        await status_msg.edit_text("❌ Ovozli qidiruvda xatolik. Matn bilan qidirib ko'ring.")
