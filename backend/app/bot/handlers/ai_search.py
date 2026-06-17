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


# Multi-language messages
MESSAGES = {
    "uz": {
        "searching": "🔍 Qidirmoqda...",
        "found_vacancies": "ta vakansiya topildi",
        "found_workers": "ta ishchi topildi",
        "not_found_local": "bazada topilmadi",
        "hh_found": "HeadHunter.uz dan",
        "not_found": "bo'yicha natija topilmadi",
        "advice": "Kasb nomini aniqroq yozing (masalan: \"oshpaz\", \"haydovchi\")",
        "open_app": "📱 Ilovada barchasini ko'rish",
        "open_hh": "🔗 hh.uz da ochish",
        "voice_processing": "🎤 Ovoz tahlil qilinmoqda...",
        "voice_understood": "Tushundim",
        "voice_failed": "Ovozingizni tushunib bo'lmadi. Qayta urinib ko'ring.",
        "voice_unavailable": "🎤 Ovozli qidiruv hozirda ishlamayapti.",
        "start_first": "Iltimos, avval /start buyrug'ini yuboring.",
        "error": "❌ Qidiruvda xatolik. Keyinroq urinib ko'ring.",
        "match": "Moslik",
    },
    "ru": {
        "searching": "🔍 Ищем...",
        "found_vacancies": "вакансий найдено",
        "found_workers": "работников найдено",
        "not_found_local": "в базе не найдено",
        "hh_found": "С HeadHunter.uz",
        "not_found": "ничего не найдено",
        "advice": "Укажите точнее профессию (например: \"повар\", \"водитель\")",
        "open_app": "📱 Открыть в приложении",
        "open_hh": "🔗 Открыть на hh.uz",
        "voice_processing": "🎤 Анализируем голос...",
        "voice_understood": "Понял",
        "voice_failed": "Не удалось распознать. Попробуйте еще раз.",
        "voice_unavailable": "🎤 Голосовой поиск пока недоступен.",
        "start_first": "Пожалуйста, сначала отправьте /start.",
        "error": "❌ Ошибка поиска. Попробуйте позже.",
        "match": "Совпадение",
    },
    "en": {
        "searching": "🔍 Searching...",
        "found_vacancies": "vacancies found",
        "found_workers": "workers found",
        "not_found_local": "not found in database",
        "hh_found": "From HeadHunter.uz",
        "not_found": "no results found",
        "advice": "Try a more specific profession name (e.g. \"cook\", \"driver\")",
        "open_app": "📱 View in app",
        "open_hh": "🔗 Open on hh.uz",
        "voice_processing": "🎤 Processing voice...",
        "voice_understood": "Got it",
        "voice_failed": "Could not understand. Please try again.",
        "voice_unavailable": "🎤 Voice search is currently unavailable.",
        "start_first": "Please send /start first.",
        "error": "❌ Search error. Please try later.",
        "match": "Match",
    },
}


def _get_lang(user) -> str:
    """Get user's language or default to uz."""
    if user and user.language:
        lang = user.language.value if hasattr(user.language, 'value') else str(user.language)
        return lang.lower() if lang.lower() in MESSAGES else "uz"
    return "uz"


def _msg(user, key: str) -> str:
    """Get localized message for user."""
    lang = _get_lang(user)
    return MESSAGES.get(lang, MESSAGES["uz"]).get(key, MESSAGES["uz"][key])


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


def _format_result(item: dict, index: int, lang: str = "uz") -> str:
    """Format a single search result for Telegram message."""
    title = item.get("title", "—")
    subtitle = item.get("subtitle", "")
    region = item.get("region", "")
    score = item.get("score", 0)
    phone = item.get("phone", "")
    salary = item.get("salary", "")
    experience = item.get("experience", "")

    match_word = MESSAGES.get(lang, MESSAGES["uz"])["match"]

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
        lines.append(f"   ✅ {match_word}: {score}%")

    return "\n".join(lines)


def _format_hh_card(item) -> str:
    """Format a single HeadHunter vacancy as a card message."""
    salary_text = ""
    if item.salary_from and item.salary_till:
        salary_text = f"💰 {item.salary_from:,} - {item.salary_till:,} {item.salary_currency}".replace(",", " ")
    elif item.salary_from:
        salary_text = f"💰 {item.salary_from:,}+ {item.salary_currency}".replace(",", " ")
    elif item.salary_till:
        salary_text = f"💰 {item.salary_till:,} gacha {item.salary_currency}".replace(",", " ")

    lines = [
        f"💼 <b>{item.title}</b>",
        f"🏢 {item.company_name}",
    ]
    if item.region:
        lines.append(f"📍 {item.region}")
    if salary_text:
        lines.append(salary_text)
    if item.experience:
        lines.append(f"🧠 {item.experience}")
    if item.description_short:
        lines.append(f"\n{item.description_short[:200]}")

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
        lang = _get_lang(user)
        m = lambda key: _msg(user, key)

        # Run AI Agent Search
        result = await _agent_search(query, role, limit=5)
        items = result.get("items", [])

        if items:
            # Format results
            search_type_label = m("found_vacancies") if result.get("search_type") == "vacancy" else m("found_workers")
            header = f"🤖 <b>\"{query}\"</b> — {len(items)} {search_type_label}:\n"
            formatted = [_format_result(item, i + 1, lang) for i, item in enumerate(items)]
            text = header + "\n\n".join(formatted)

            # WebApp button
            webapp_url = _get_webapp_url(query)
            webapp_kb = types.InlineKeyboardMarkup(
                inline_keyboard=[
                    [types.InlineKeyboardButton(
                        text=m("open_app"),
                        web_app=types.WebAppInfo(url=webapp_url),
                    )]
                ]
            )
            await message.answer(text, reply_markup=webapp_kb, parse_mode="HTML")
        else:
            # Fallback: HeadHunter search
            hh_items = await _hh_fallback_search(query, limit=5)
            if hh_items:
                # Send header
                await message.answer(
                    f"📋 <b>\"{query}\"</b> — {m('not_found_local')}.\n\n🌐 {m('hh_found')} {len(hh_items)} ta:",
                    parse_mode="HTML"
                )
                # Send each HH vacancy as separate message with link button
                for item in hh_items:
                    hh_text = _format_hh_card(item)
                    hh_kb = types.InlineKeyboardMarkup(
                        inline_keyboard=[
                            [types.InlineKeyboardButton(
                                text=m("open_hh"),
                                url=item.url,
                            )]
                        ]
                    )
                    await message.answer(hh_text, reply_markup=hh_kb, parse_mode="HTML")
            else:
                text = (
                    f"😕 <b>\"{query}\"</b> — {m('not_found')}.\n\n"
                    f"💡 {m('advice')}"
                )
                await message.answer(text, parse_mode="HTML")

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
        await message.answer(_msg(user, "voice_unavailable"))
        return

    m = lambda key: _msg(user, key)
    lang = _get_lang(user)
    status_msg = await message.answer(m("voice_processing"))

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
            await status_msg.edit_text(m("voice_failed"))
            return

        await status_msg.edit_text(f"🎤 {m('voice_understood')}: <b>\"{transcribed_text}\"</b>", parse_mode="HTML")

        # AI Agent Search
        role = user.role.value if user.role else "job_seeker"
        result = await _agent_search(transcribed_text, role, limit=5)
        items = result.get("items", [])

        if items:
            search_type_label = m("found_vacancies") if result.get("search_type") == "vacancy" else m("found_workers")
            header = f"🎤 <b>\"{transcribed_text}\"</b> — {len(items)} {search_type_label}:\n"
            formatted = [_format_result(item, i + 1, lang) for i, item in enumerate(items)]
            text = header + "\n\n".join(formatted)

            webapp_url = _get_webapp_url(transcribed_text)
            webapp_kb = types.InlineKeyboardMarkup(
                inline_keyboard=[
                    [types.InlineKeyboardButton(
                        text=m("open_app"),
                        web_app=types.WebAppInfo(url=webapp_url),
                    )]
                ]
            )
            await status_msg.edit_text(text, reply_markup=webapp_kb, parse_mode="HTML")
        else:
            # HH fallback - send each as separate message
            hh_items = await _hh_fallback_search(transcribed_text, limit=5)
            if hh_items:
                await status_msg.edit_text(
                    f"🎤 <b>\"{transcribed_text}\"</b> — {m('not_found_local')}.\n\n🌐 {m('hh_found')} {len(hh_items)} ta:",
                    parse_mode="HTML"
                )
                for item in hh_items:
                    hh_text = _format_hh_card(item)
                    hh_kb = types.InlineKeyboardMarkup(
                        inline_keyboard=[
                            [types.InlineKeyboardButton(
                                text=m("open_hh"),
                                url=item.url,
                            )]
                        ]
                    )
                    await message.answer(hh_text, reply_markup=hh_kb, parse_mode="HTML")
            else:
                await status_msg.edit_text(
                    f"😕 <b>\"{transcribed_text}\"</b> — {m('not_found')}.",
                    parse_mode="HTML"
                )

    except Exception as e:
        logger.error(f"Voice search error: {e}")
        await status_msg.edit_text(m("error"))
