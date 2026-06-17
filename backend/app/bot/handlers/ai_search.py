"""
AI Search Bot Handler
Handles text and voice messages to find matching vacancies/workers.
- Text message: AI analyzes and finds matching vacancies
- Voice message: Converts to text, then finds matches
"""
import logging
from aiogram import Router, F, types
from aiogram.enums import ContentType
from aiogram_i18n import I18nContext

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.resume import Resume, ResumeStatus
from app.models.user import User, UserRole
from app.services.ai_worker_finder import AIWorkerFinderService
from app.schemas.ai import AIWorkerFinderRequest

from sqlalchemy import select
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


async def _search_vacancies(query: str, limit: int = 5):
    """Search vacancies by text."""
    async with async_session_maker() as session:
        from sqlalchemy import or_
        from app.models.profession import Profession

        search_filter = f"%{query}%"
        result = await session.execute(
            select(Vacancy)
            .where(Vacancy.status == VacancyStatus.ACTIVE)
            .where(
                or_(
                    Vacancy.description.ilike(search_filter),
                    Vacancy.company_name.ilike(search_filter),
                )
            )
            .options(
                selectinload(Vacancy.profession),
                selectinload(Vacancy.region),
            )
            .order_by(Vacancy.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()


async def _search_workers(query: str, limit: int = 5):
    """Search resumes/workers by text."""
    async with async_session_maker() as session:
        from sqlalchemy import or_

        search_filter = f"%{query}%"
        result = await session.execute(
            select(Resume)
            .where(Resume.status == ResumeStatus.ACTIVE)
            .where(
                or_(
                    Resume.description.ilike(search_filter),
                    Resume.first_name.ilike(search_filter),
                    Resume.last_name.ilike(search_filter),
                )
            )
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
            )
            .order_by(Resume.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()


def _format_vacancy_message(vacancy: Vacancy) -> str:
    """Format a vacancy for Telegram message."""
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
        f"💼 <b>{profession_name}</b>\n"
        f"🏢 {vacancy.company_name}\n"
        f"📍 {region_name}\n"
        f"💰 {salary_text}\n"
        f"📞 {vacancy.phone or '—'}"
    )


def _format_worker_message(resume: Resume) -> str:
    """Format a resume/worker for Telegram message."""
    profession_name = resume.profession.name_uz if resume.profession else "—"
    region_name = resume.region.name_uz if resume.region else "—"

    return (
        f"👤 <b>{resume.first_name} {resume.last_name}</b>\n"
        f"💼 {profession_name}\n"
        f"📍 {region_name}\n"
        f"🧠 {resume.experience} yil tajriba\n"
        f"📞 {resume.phone or '—'}"
    )


@router.message(F.text & ~F.text.startswith("/"))
async def handle_text_search(message: types.Message, i18n: I18nContext):
    """
    Handle any text message (not a command) as a job search query.
    Role-based: employer gets workers, job seeker gets vacancies.
    """
    query = message.text.strip()
    if len(query) < 2:
        return

    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    await message.answer("🔍 AI qidirmoqda...")

    try:
        if user.role == UserRole.CANDIDATE_HUNTER:
            # Employer searches for workers
            workers = await _search_workers(query)
            if workers:
                header = f"👥 <b>Sizning so'rovingiz:</b> \"{query}\"\n\n🤖 AI {len(workers)} ta mos ishchi topdi:\n\n"
                messages = [_format_worker_message(w) for w in workers]
                text = header + "\n\n".join(messages)
            else:
                text = f"😕 \"{query}\" bo'yicha mos ishchi topilmadi.\n\nBoshqa so'z bilan qidirib ko'ring."
        else:
            # Job seeker searches for vacancies
            vacancies = await _search_vacancies(query)
            if vacancies:
                header = f"📋 <b>Sizning so'rovingiz:</b> \"{query}\"\n\n🤖 AI {len(vacancies)} ta mos vakansiya topdi:\n\n"
                messages = [_format_vacancy_message(v) for v in vacancies]
                text = header + "\n\n".join(messages)
            else:
                text = f"😕 \"{query}\" bo'yicha mos vakansiya topilmadi.\n\nBoshqa so'z bilan qidirib ko'ring."

        # Add webapp button
        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    types.InlineKeyboardButton(
                        text="📱 Ilovada ko'rish",
                        web_app=types.WebAppInfo(url=settings.MINI_APP_URL),
                    )
                ]
            ]
        )
        await message.answer(text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"AI bot search error: {e}")
        await message.answer("❌ Qidiruvda xatolik yuz berdi. Keyinroq urinib ko'ring.")


@router.message(F.voice)
async def handle_voice_search(message: types.Message, i18n: I18nContext):
    """
    Handle voice messages - download, transcribe with OpenAI Whisper, then search.
    """
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("🎤 Ovozli qidiruv hozirda ishlamayapti.")
        return

    await message.answer("🎤 Ovozingiz tahlil qilinmoqda...")

    try:
        # Download voice file
        voice = message.voice
        file = await message.bot.get_file(voice.file_id)
        file_path = file.file_path

        # Download to bytes
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
            await message.answer("🎤 Ovozingizni tushunib bo'lmadi. Qayta urinib ko'ring.")
            return

        await message.answer(f"🎤 Tushundim: \"{transcribed_text}\"\n\n🔍 Qidirmoqda...")

        # Now search based on role
        if user.role == UserRole.CANDIDATE_HUNTER:
            workers = await _search_workers(transcribed_text)
            if workers:
                header = f"👥 <b>Ovozli so'rov:</b> \"{transcribed_text}\"\n\n🤖 {len(workers)} ta mos ishchi:\n\n"
                messages = [_format_worker_message(w) for w in workers]
                text = header + "\n\n".join(messages)
            else:
                text = f"😕 \"{transcribed_text}\" bo'yicha ishchi topilmadi."
        else:
            vacancies = await _search_vacancies(transcribed_text)
            if vacancies:
                header = f"📋 <b>Ovozli so'rov:</b> \"{transcribed_text}\"\n\n🤖 {len(vacancies)} ta mos vakansiya:\n\n"
                messages = [_format_vacancy_message(v) for v in vacancies]
                text = header + "\n\n".join(messages)
            else:
                text = f"😕 \"{transcribed_text}\" bo'yicha vakansiya topilmadi."

        webapp_kb = types.InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    types.InlineKeyboardButton(
                        text="📱 Ilovada ko'rish",
                        web_app=types.WebAppInfo(url=settings.MINI_APP_URL),
                    )
                ]
            ]
        )
        await message.answer(text, reply_markup=webapp_kb, parse_mode="HTML")

    except Exception as e:
        logger.error(f"Voice search error: {e}")
        await message.answer("❌ Ovozli qidiruvda xatolik. Matn bilan qidirib ko'ring.")
