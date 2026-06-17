"""
AI Search Bot Handler
Handles text and voice messages to find matching vacancies/workers.
- Text message: searches by profession + keywords
- Voice message: Whisper transcription then search
"""
import logging
from aiogram import Router, F, types
from aiogram_i18n import I18nContext

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.resume import Resume, ResumeStatus
from app.models.user import User, UserRole
from app.models.profession import Profession

from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)

router = Router()


async def _get_user(telegram_id: str):
    """Get user from database."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()


async def _find_matching_professions(query: str, limit: int = 10):
    """Find professions matching the query text."""
    async with async_session_maker() as session:
        search_filter = f"%{query}%"
        result = await session.execute(
            select(Profession).where(
                Profession.is_active == True,
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            ).limit(limit)
        )
        return result.scalars().all()


async def _search_vacancies(query: str, limit: int = 5):
    """Search vacancies by profession name + description keywords."""
    async with async_session_maker() as session:
        search_filter = f"%{query}%"

        # First find matching professions
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

        # Search vacancies by profession OR description/company
        query_stmt = (
            select(Vacancy)
            .where(Vacancy.status == VacancyStatus.ACTIVE)
            .options(
                selectinload(Vacancy.profession),
                selectinload(Vacancy.region),
            )
        )

        if profession_ids:
            query_stmt = query_stmt.where(
                or_(
                    Vacancy.profession_id.in_(profession_ids),
                    Vacancy.description.ilike(search_filter),
                    Vacancy.company_name.ilike(search_filter),
                )
            )
        else:
            query_stmt = query_stmt.where(
                or_(
                    Vacancy.description.ilike(search_filter),
                    Vacancy.company_name.ilike(search_filter),
                )
            )

        result = await session.execute(
            query_stmt.order_by(Vacancy.created_at.desc()).limit(limit)
        )
        return result.scalars().all()


async def _search_workers(query: str, limit: int = 5):
    """Search resumes/workers by profession + description."""
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

        query_stmt = (
            select(Resume)
            .where(Resume.status == ResumeStatus.ACTIVE)
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
            )
        )

        if profession_ids:
            query_stmt = query_stmt.where(
                or_(
                    Resume.profession_id.in_(profession_ids),
                    Resume.description.ilike(search_filter),
                    Resume.first_name.ilike(search_filter),
                    Resume.last_name.ilike(search_filter),
                )
            )
        else:
            query_stmt = query_stmt.where(
                or_(
                    Resume.description.ilike(search_filter),
                    Resume.first_name.ilike(search_filter),
                    Resume.last_name.ilike(search_filter),
                )
            )

        result = await session.execute(
            query_stmt.order_by(Resume.created_at.desc()).limit(limit)
        )
        return result.scalars().all()


def _format_vacancy(vacancy: Vacancy, index: int) -> str:
    """Format a single vacancy for Telegram."""
    profession_name = vacancy.profession.name_uz if vacancy.profession else "—"
    region_name = vacancy.region.name_uz if vacancy.region else "—"

    salary_text = "Kelishiladi"
    if vacancy.salary_from and vacancy.salary_till:
        salary_text = f"{vacancy.salary_from:,} - {vacancy.salary_till:,} so'm".replace(",", " ")
    elif vacancy.salary_from:
        salary_text = f"{vacancy.salary_from:,} so'mdan".replace(",", " ")
    elif vacancy.salary_till:
        salary_text = f"{vacancy.salary_till:,} so'mgacha".replace(",", " ")

    return (
        f"<b>{index}. {profession_name}</b>\n"
        f"   🏢 {vacancy.company_name}\n"
        f"   📍 {region_name} | 💰 {salary_text}\n"
        f"   📞 {vacancy.phone or '—'}"
    )


def _format_worker(resume: Resume, index: int) -> str:
    """Format a single worker for Telegram."""
    profession_name = resume.profession.name_uz if resume.profession else "—"
    region_name = resume.region.name_uz if resume.region else "—"

    return (
        f"<b>{index}. {resume.first_name} {resume.last_name}</b>\n"
        f"   💼 {profession_name} | 🧠 {resume.experience} yil\n"
        f"   📍 {region_name}\n"
        f"   📞 {resume.phone or '—'}"
    )


def _get_webapp_url(query: str) -> str:
    """Generate webapp URL with search query."""
    import urllib.parse
    base = settings.MINI_APP_URL.rstrip("/")
    encoded_query = urllib.parse.quote(query)
    return f"{base}?search={encoded_query}"


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_search(message: types.Message, i18n: I18nContext):
    """Handle text message as job search query. Role-based results."""
    query = message.text.strip()
    if len(query) < 2:
        return

    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    try:
        if user.role == UserRole.CANDIDATE_HUNTER:
            # Ish beruvchi — ishchi qidiradi
            workers = await _search_workers(query)
            if workers:
                lines = [f"👥 <b>\"{query}\"</b> bo'yicha {len(workers)} ta ishchi topildi:\n"]
                for i, w in enumerate(workers, 1):
                    lines.append(_format_worker(w, i))
                text = "\n\n".join(lines)
            else:
                text = f"😕 <b>\"{query}\"</b> bo'yicha ishchi topilmadi.\n\nBoshqa kasb nomi bilan qidirib ko'ring."
        else:
            # Ish qidiruvchi — vakansiya qidiradi
            vacancies = await _search_vacancies(query)
            if vacancies:
                lines = [f"📋 <b>\"{query}\"</b> bo'yicha {len(vacancies)} ta vakansiya topildi:\n"]
                for i, v in enumerate(vacancies, 1):
                    lines.append(_format_vacancy(v, i))
                text = "\n\n".join(lines)
            else:
                text = f"😕 <b>\"{query}\"</b> bo'yicha vakansiya topilmadi.\n\nBoshqa kasb nomi bilan qidirib ko'ring."

        # WebApp button with search query
        webapp_url = _get_webapp_url(query)
        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    types.InlineKeyboardButton(
                        text="📱 Ilovada barchasini ko'rish",
                        web_app=types.WebAppInfo(url=webapp_url),
                    )
                ]
            ]
        )
        await message.answer(text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"Bot search error: {e}")
        await message.answer("❌ Qidiruvda xatolik yuz berdi. Keyinroq urinib ko'ring.")


@router.message(F.voice)
async def handle_voice_search(message: types.Message, i18n: I18nContext):
    """Handle voice messages - transcribe with Whisper then search."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("🎤 Ovozli qidiruv hozirda ishlamayapti.")
        return

    status_msg = await message.answer("🎤 Ovozingiz tahlil qilinmoqda...")

    try:
        # Download voice file
        voice = message.voice
        file = await message.bot.get_file(voice.file_id)
        file_path = file.file_path

        from io import BytesIO
        voice_data = BytesIO()
        await message.bot.download_file(file_path, voice_data)
        voice_data.seek(0)

        # Transcribe using OpenAI Whisper
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        voice_data.name = "voice.ogg"
        transcription = await client.audio.transcriptions.create(
            model="whisper-1",
            file=voice_data,
            language="uz",
        )

        transcribed_text = transcription.text.strip()
        if not transcribed_text:
            await status_msg.edit_text("🎤 Ovozingizni tushunib bo'lmadi. Qayta urinib ko'ring.")
            return

        # Delete status message
        await status_msg.edit_text(f"🎤 Tushundim: <b>\"{transcribed_text}\"</b>\n\n🔍 Qidirmoqda...")

        # Search based on role
        if user.role == UserRole.CANDIDATE_HUNTER:
            workers = await _search_workers(transcribed_text)
            if workers:
                lines = [f"👥 Ovozli qidiruv: <b>\"{transcribed_text}\"</b>\n{len(workers)} ta ishchi topildi:\n"]
                for i, w in enumerate(workers, 1):
                    lines.append(_format_worker(w, i))
                text = "\n\n".join(lines)
            else:
                text = f"😕 <b>\"{transcribed_text}\"</b> bo'yicha ishchi topilmadi."
        else:
            vacancies = await _search_vacancies(transcribed_text)
            if vacancies:
                lines = [f"📋 Ovozli qidiruv: <b>\"{transcribed_text}\"</b>\n{len(vacancies)} ta vakansiya topildi:\n"]
                for i, v in enumerate(vacancies, 1):
                    lines.append(_format_vacancy(v, i))
                text = "\n\n".join(lines)
            else:
                text = f"😕 <b>\"{transcribed_text}\"</b> bo'yicha vakansiya topilmadi."

        webapp_url = _get_webapp_url(transcribed_text)
        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    types.InlineKeyboardButton(
                        text="📱 Ilovada barchasini ko'rish",
                        web_app=types.WebAppInfo(url=webapp_url),
                    )
                ]
            ]
        )
        await status_msg.edit_text(text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"Voice search error: {e}")
        await status_msg.edit_text("❌ Ovozli qidiruvda xatolik. Matn bilan qidirib ko'ring.")
