import asyncio
import html
import logging
import re
from datetime import datetime, timedelta

from aiogram import Bot, types
from aiogram.exceptions import TelegramForbiddenError
from aiogram.utils.keyboard import InlineKeyboardBuilder
from app.core.config import settings
from app.models.profession import Profession
from app.models.resume import Resume, ResumeStatus
from app.models.user import User, UserLanguage, UserRole
from app.models.vacancy import Vacancy, VacancyStatus
from redis.asyncio import Redis
from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

logger = logging.getLogger(__name__)


class NotificationService:
    REDIS_KEY_LAST_RUN = "notification:last_run"
    REDIS_KEY_PREFIX_SENT_VACANCY = "notification:sent:vacancy"
    REDIS_KEY_PREFIX_SENT_RESUME = "notification:sent:resume"
    RATE_LIMIT_DELAY = 2.0  # 2 seconds delay = 30 messages/minute
    NOTIFICATION_TTL = 60 * 60 * 24 * 7  # 7 days

    def __init__(self, bot: Bot, redis: Redis):
        self.bot = bot
        self.redis = redis

    def _parse_markdown_text(self, text: str) -> str:
        """
        Escapes HTML characters and then parses basic Markdown (bold, italic).
        Priority:
        1. HTML Escape to prevent XSS/Injection.
        2. Convert **bold** -> <b>bold</b>
        3. Convert __italic__ -> <i>italic</i> (optional, but good for consistency)
        """
        if not text:
            return ""

        # 1. Escape HTML first
        safe_text = html.escape(text)

        # 2. Parse Bold (**text**)
        # Using a regex that mimics markdown bold: double asterisks surrounding content
        # We use a non-greedy match for content
        safe_text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", safe_text)

        # 3. Parse Italic (__text__) - not strictly requested but helpful
        safe_text = re.sub(r"\_\_(.+?)\_\_", r"<i>\1</i>", safe_text)

        return safe_text

    async def get_last_run_time(self) -> datetime:
        """Get the last run time from Redis."""
        last_run_iso = await self.redis.get(self.REDIS_KEY_LAST_RUN)
        if last_run_iso:
            return datetime.fromisoformat(last_run_iso)
        # If no last run, default to 24 hours ago to avoid spamming too much history
        return datetime.utcnow() - timedelta(hours=24)

    async def set_last_run_time(self, dt: datetime):
        """Set the last run time in Redis."""
        await self.redis.set(self.REDIS_KEY_LAST_RUN, dt.isoformat())

    async def _is_notified(self, prefix: str, object_id: int, user_id: int) -> bool:
        """Check if a notification for a specific object has already been sent to a user."""
        key = f"{prefix}:{object_id}:{user_id}"
        return await self.redis.exists(key)

    async def _mark_as_notified(self, prefix: str, object_id: int, user_id: int):
        """Mark a notification as sent in Redis with a TTL."""
        key = f"{prefix}:{object_id}:{user_id}"
        await self.redis.set(key, "1", ex=self.NOTIFICATION_TTL)

    async def _send_message(
        self,
        db: AsyncSession,
        user_id: int,
        telegram_id: str,
        text: str,
        kb: types.InlineKeyboardMarkup = None,
    ) -> bool:
        """Send message safely with rate limiting and handle blocking."""
        try:
            await self.bot.send_message(
                chat_id=telegram_id, text=text, reply_markup=kb, parse_mode="HTML"
            )
            # If successful, ensure user is not marked as blocked
            stmt = update(User).where(User.id == user_id).values(is_blocked=False)
            await db.execute(stmt)
            await db.commit()

            # Rate limiting
            await asyncio.sleep(self.RATE_LIMIT_DELAY)
            return True
        except TelegramForbiddenError:
            logger.warning(
                f"User {telegram_id} has blocked the bot. Marking as blocked."
            )
            stmt = update(User).where(User.id == user_id).values(is_blocked=True)
            await db.execute(stmt)
            await db.commit()
            return False
        except Exception as e:
            logger.error(f"Failed to send notification to user {telegram_id}: {e}")
            return False

    def _format_salary(
        self, salary_from: int | None, salary_till: int | None, lang: UserLanguage
    ) -> str:
        s_currency = "so‘m"
        s_negotiable = {
            UserLanguage.UZ: "Kelishiladi",
            UserLanguage.RU: "Договорная",
            UserLanguage.EN: "Negotiable",
        }
        s_from = {
            UserLanguage.UZ: "dan boshlab",
            UserLanguage.RU: "от",
            UserLanguage.EN: "starting from",
        }
        s_till = {
            UserLanguage.UZ: "gacha",
            UserLanguage.RU: "до",
            UserLanguage.EN: "up to",
        }

        if salary_from and salary_till:
            return f"{salary_from:,} – {salary_till:,} {s_currency}".replace(",", " ")
        elif salary_from:
            if lang == UserLanguage.UZ:
                return f"{salary_from:,} {s_currency} {s_from[lang]}".replace(",", " ")
            else:
                return f"{s_from[lang]} {salary_from:,} {s_currency}".replace(",", " ")
        elif salary_till:
            if lang == UserLanguage.UZ:
                return f"{salary_till:,} {s_currency} {s_till[lang]}".replace(",", " ")
            else:
                return f"{s_till[lang]} {salary_till:,} {s_currency}".replace(",", " ")
        else:
            return s_negotiable.get(lang, "Kelishiladi")

    async def _get_translation(self, key: str, lang: UserLanguage, **kwargs) -> str:
        return key  # Placeholder

    async def run(self, db: AsyncSession):
        last_run = await self.get_last_run_time()
        now = datetime.utcnow()

        logger.info(f"Running notification service. Last run: {last_run}")

        # 1. Notify candidates about new vacancies
        await self.notify_candidates_logic(db, last_run)

        # 2. Notify employers about new resumes
        await self.notify_employers_logic(db, last_run)

        await self.set_last_run_time(now)

    async def notify_candidates_logic(self, db: AsyncSession, last_run: datetime):
        # Fetch new vacancies
        stmt = (
            select(Vacancy)
            .options(joinedload(Vacancy.profession), joinedload(Vacancy.region))
            .where(
                and_(
                    Vacancy.created_at > last_run,
                    Vacancy.status == VacancyStatus.ACTIVE,
                )
            )
        )
        result = await db.execute(stmt)
        vacancies = result.scalars().all()

        for vacancy in vacancies:
            if not vacancy.profession:
                continue

            # Find target users
            # Users with active Resume in same profession, excluding owner
            q = (
                select(User)
                .join(Resume)
                .where(
                    and_(
                        Resume.profession_id == vacancy.profession_id,
                        Resume.status == ResumeStatus.ACTIVE,
                        User.id != vacancy.user_id,
                        User.is_active == True,
                    )
                )
                .distinct()
            )

            users_res = await db.execute(q)
            users = users_res.scalars().all()

            for user in users:
                # Check idempotency
                if await self._is_notified(
                    self.REDIS_KEY_PREFIX_SENT_VACANCY, vacancy.id, user.id
                ):
                    continue

                lang = user.language or UserLanguage.UZ
                prof_name = getattr(
                    vacancy.profession, f"name_{lang.value}", vacancy.profession.name_uz
                )
                region_name = (
                    getattr(
                        vacancy.region, f"name_{lang.value}", vacancy.region.name_uz
                    )
                    if vacancy.region
                    else "Unknown"
                )

                salary_text = self._format_salary(
                    vacancy.salary_from, vacancy.salary_till, lang
                )

                # Format work type/format
                wt_map = {
                    "fulltime": {
                        "uz": "To‘liq stavka",
                        "ru": "Полная занятость",
                        "en": "Full-time",
                    },
                    "part-time": {
                        "uz": "Yarim stavka",
                        "ru": "Частичная занятость",
                        "en": "Part-time",
                    },
                }
                wf_map = {
                    "onsite": {"uz": "Ofis", "ru": "Офис", "en": "On-site"},
                    "remote": {"uz": "Masofaviy", "ru": "Удаленно", "en": "Remote"},
                }

                w_type = wt_map.get(vacancy.work_type.value, {}).get(
                    lang.value, vacancy.work_type.value
                )
                w_format = wf_map.get(vacancy.work_format.value, {}).get(
                    lang.value, vacancy.work_format.value
                )
                work_details = f"{w_type} / {w_format}"

                # Contact info
                contacts = []
                if vacancy.phone:
                    contacts.append(f"📱 {html.escape(vacancy.phone)}")
                if vacancy.telegram:
                    contacts.append(f"💬 @{html.escape(vacancy.telegram.lstrip('@'))}")
                if vacancy.email:
                    contacts.append(f"📧 {html.escape(vacancy.email)}")
                contact_block = "\n".join(contacts)

                # Escape dynamic content
                prof_name_esc = html.escape(prof_name)
                comp_name_esc = html.escape(vacancy.company_name)
                region_name_esc = html.escape(region_name)

                # Use custom markdown parser for description
                desc_formatted = self._parse_markdown_text(vacancy.description)

                # Message Content
                if lang == UserLanguage.EN:
                    text = (
                        f"🔔 <b>New Job Opportunity!</b>\n\n"
                        f"💼 Position: <b>{prof_name_esc}</b>\n"
                        f"🏢 Company: <b>{comp_name_esc}</b>\n"
                        f"📍 Location: <b>{region_name_esc}</b>\n"
                        f"💰 Salary: {salary_text}\n"
                        f"🕒 Job Type: {work_details}\n\n"
                        f"📝 Requirements: {desc_formatted}\n\n"
                    )
                    if contact_block:
                        text += f"📞 Contact:\n{contact_block}"
                elif lang == UserLanguage.RU:
                    text = (
                        f"🔔 <b>Вам найдена вакансия!</b>\n\n"
                        f"💼 Должность: <b>{prof_name_esc}</b>\n"
                        f"🏢 Компания: <b>{comp_name_esc}</b>\n"
                        f"📍 Адрес: <b>{region_name_esc}</b>\n"
                        f"💰 Зарплата: {salary_text}\n"
                        f"🕒 Тип работы: {work_details}\n\n"
                        f"📝 Требования: {desc_formatted}\n\n"
                    )
                    if contact_block:
                        text += f"📞 Контакты:\n{contact_block}"
                else:  # UZ
                    text = (
                        f"🔔 <b>Sizga mos Vakansiya topildi!</b>\n\n"
                        f"💼 Lavozim: <b>{prof_name_esc}</b>\n"
                        f"🏢 Kompaniya: <b>{comp_name_esc}</b>\n"
                        f"📍 Manzil: <b>{region_name_esc}</b>\n"
                        f"💰 Maosh: {salary_text}\n"
                        f"🕒 Ish turi: {work_details}\n\n"
                        f"📝 Talablar: {desc_formatted}\n\n"
                    )
                    if contact_block:
                        text += f"📞 Bog‘lanish uchun:\n{contact_block}"

                kb = InlineKeyboardBuilder()
                if lang == UserLanguage.RU:
                    btn_text = "Открыть приложение"
                elif lang == UserLanguage.UZ:
                    btn_text = "Ilovani ochish"
                else:
                    btn_text = "Open Mini App"

                kb.button(
                    text=btn_text, web_app=types.WebAppInfo(url=settings.MINI_APP_URL)
                )

                success = await self._send_message(
                    db, user.id, user.telegram_id, text, kb.as_markup()
                )
                if success:
                    await self._mark_as_notified(
                        self.REDIS_KEY_PREFIX_SENT_VACANCY, vacancy.id, user.id
                    )

    async def notify_employers_logic(self, db: AsyncSession, last_run: datetime):
        # Fetch new resumes
        stmt = (
            select(Resume)
            .options(
                joinedload(Resume.profession).joinedload(Profession.category),
                joinedload(Resume.region),
            )
            .where(
                and_(Resume.created_at > last_run, Resume.status == ResumeStatus.ACTIVE)
            )
        )
        result = await db.execute(stmt)
        resumes = result.scalars().all()

        for resume in resumes:
            if not resume.profession:
                continue

            # Find target users
            # Users with active Vacancy in same profession, excluding owner
            q = (
                select(User)
                .join(Vacancy)
                .where(
                    and_(
                        Vacancy.profession_id == resume.profession_id,
                        Vacancy.status == VacancyStatus.ACTIVE,
                        User.id != resume.user_id,
                        User.is_active == True,
                    )
                )
                .distinct()
            )

            users_res = await db.execute(q)
            users = users_res.scalars().all()

            for user in users:
                # Check idempotency
                if await self._is_notified(
                    self.REDIS_KEY_PREFIX_SENT_RESUME, resume.id, user.id
                ):
                    continue

                lang = user.language or UserLanguage.UZ
                prof_name = getattr(
                    resume.profession, f"name_{lang.value}", resume.profession.name_uz
                )

                # Category name
                cat_name = "Unknown"
                if resume.profession.category:
                    cat_name = getattr(
                        resume.profession.category,
                        f"name_{lang.value}",
                        resume.profession.category.name_uz,
                    )

                region_name = (
                    getattr(resume.region, f"name_{lang.value}", resume.region.name_uz)
                    if resume.region
                    else "Unknown"
                )

                # Contact info
                contacts = []
                if resume.phone:
                    contacts.append(f"📱 {html.escape(resume.phone)}")
                if resume.telegram:
                    contacts.append(f"💬 @{html.escape(resume.telegram.lstrip('@'))}")
                if resume.email:
                    contacts.append(f"📧 {html.escape(resume.email)}")
                contact_block = "\n".join(contacts)

                # Escape fields
                prof_name_esc = html.escape(prof_name)
                cat_name_esc = html.escape(cat_name)
                region_name_esc = html.escape(region_name)

                # Use custom markdown parser for description
                desc_formatted = self._parse_markdown_text(resume.description)

                # Message Content
                if lang == UserLanguage.EN:
                    text = (
                        f"🔔 <b>New Talent Found!</b>\n\n"
                        f"👤 Specialist: <b>{prof_name_esc}</b>\n"
                        f"🎯 Direction: <b>{cat_name_esc}</b>\n"
                        f"🧠 Experience: {resume.experience} years\n"
                        f"🛠 Skills: {desc_formatted}\n\n"
                        f"📍 Location: <b>{region_name_esc}</b>\n"
                    )

                    if contact_block:
                        text += f"\n📞 Contact:\n{contact_block}"

                elif lang == UserLanguage.RU:
                    text = (
                        f"🔔 <b>Новое резюме!</b>\n\n"
                        f"👤 Специалист: <b>{prof_name_esc}</b>\n"
                        f"🎯 Направление: <b>{cat_name_esc}</b>\n"
                        f"🧠 Опыт: {resume.experience} лет\n"
                        f"🛠 Навыки: {desc_formatted}\n\n"
                        f"📍 Местоположение: <b>{region_name_esc}</b>\n"
                    )

                    if contact_block:
                        text += f"\n📞 Контакты:\n{contact_block}"

                else:  # UZ
                    text = (
                        f"🔔 <b>Sizga mos Resume yuklandi!</b>\n\n"
                        f"👤 Mutaxassis: <b>{prof_name_esc}</b>\n"
                        f"🎯 Yo‘nalish: <b>{cat_name_esc}</b>\n"
                        f"🧠 Tajriba: {resume.experience} yil\n"
                        f"🛠 Ko‘nikmalar: {desc_formatted}\n\n"
                        f"📍 Joylashuv: <b>{region_name_esc}</b>\n"
                    )

                    if contact_block:
                        text += f"\n📞 Bog‘lanish uchun:\n{contact_block}"

                kb = InlineKeyboardBuilder()
                if lang == UserLanguage.RU:
                    btn_text = "Открыть приложение"
                elif lang == UserLanguage.UZ:
                    btn_text = "Ilovani ochish"
                else:
                    btn_text = "Open Mini App"

                kb.button(
                    text=btn_text, web_app=types.WebAppInfo(url=settings.MINI_APP_URL)
                )

                success = await self._send_message(
                    db, user.id, user.telegram_id, text, kb.as_markup()
                )
                if success:
                    await self._mark_as_notified(
                        self.REDIS_KEY_PREFIX_SENT_RESUME, resume.id, user.id
                    )
