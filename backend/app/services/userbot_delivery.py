"""
Daily delivery of channel-sourced vacancies to users (12:00 and 20:00).

Targets users who have engaged with the bot (have a BotUserProfile). For each
user we pick recent channel-imported vacancies that match their interest
(profession text), falling back to the latest ones. Each vacancy is sent with
an inline "Bog'lanish" button that opens the original channel post, plus a
"Batafsil" button that opens the Mini App vacancy page.

All sends are wrapped in try/except so a blocked user never breaks the job.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.bot_user_profile import BotUserProfile
from app.models.user import User
from app.models.vacancy import Vacancy, VacancyStatus
from app.services.ai_core import get_openai_client

logger = logging.getLogger(__name__)

MAX_PER_USER = 3
RECENT_WINDOW_HOURS = 12

_DELIVERY_HEADERS = {
    "uz": "🔔 Siz uchun yangi vakansiya",
    "ru": "🔔 Новая вакансия для вас",
    "en": "🔔 New vacancy for you",
}


def _salary_text(vacancy: Vacancy) -> str:
    if vacancy.salary_from and vacancy.salary_till:
        return f"{vacancy.salary_from:,} - {vacancy.salary_till:,} so'm".replace(",", " ")
    if vacancy.salary_from:
        return f"{vacancy.salary_from:,} so'm dan".replace(",", " ")
    return "Kelishiladi"


def _full_image_url(image_url: Optional[str]) -> Optional[str]:
    """Telegram needs an absolute URL. Resolve relative /uploads paths."""
    if not image_url:
        return None
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return image_url
    base = (settings.MINI_APP_URL or settings.WEBHOOK_URL or "").rstrip("/")
    if base.startswith("https://") and image_url.startswith("/"):
        return f"{base}{image_url}"
    return None


def _vacancy_deeplink(vacancy_id: int) -> Optional[str]:
    if settings.BOT_USERNAME and settings.MINI_APP_NAME:
        return f"https://t.me/{settings.BOT_USERNAME}/{settings.MINI_APP_NAME}?startapp=vacancy_{vacancy_id}"
    if settings.MINI_APP_URL:
        return f"{settings.MINI_APP_URL.rstrip('/')}?vacancy={vacancy_id}"
    return None


def _format_vacancy(vacancy: Vacancy, lang: str) -> str:
    """Static template fallback used when AI text generation is unavailable."""
    profession = vacancy.profession.name_uz if vacancy.profession else "—"
    region = vacancy.region.name_uz if vacancy.region else "—"
    salary = _salary_text(vacancy)

    header = _DELIVERY_HEADERS.get(lang, _DELIVERY_HEADERS["uz"])
    desc = (vacancy.description or "")[:500]
    lines = [
        f"<b>{header}</b>",
        "",
        f"💼 <b>{profession}</b>",
        f"🏢 {vacancy.company_name}",
        f"📍 {region}",
        f"💰 {salary}",
        "",
        desc,
    ]
    return "\n".join(lines)


async def _ai_vacancy_message(vacancy: Vacancy, lang: str) -> Optional[str]:
    """Write a short, human-friendly recommendation with AI (no header/buttons).

    Returns None if AI is disabled or the call fails, so the caller can fall
    back to the static template. The contact info and inline buttons are added
    separately and are never produced here.
    """
    if not settings.ai_enabled:
        return None

    profession = vacancy.profession.name_uz if vacancy.profession else "—"
    region = vacancy.region.name_uz if vacancy.region else "—"
    facts = (
        f"Lavozim: {profession}\n"
        f"Kompaniya: {vacancy.company_name}\n"
        f"Hudud: {region}\n"
        f"Maosh: {_salary_text(vacancy)}\n"
        f"Tavsif: {(vacancy.description or '')[:600]}"
    )
    lang_name = {"ru": "rus", "en": "ingliz"}.get(lang, "o'zbek")
    system_prompt = (
        "Sen ISHKOP ish qidiruv platformasining do'stona AI yordamchisisan. "
        "Berilgan vakansiya ma'lumotidan foydalanuvchiga tavsiya sifatida "
        "yuborish uchun jonli, samimiy va tushunarli xabar yozasan. "
        "Hech qanday yangi ma'lumot O'YLAB TOPMA — faqat berilganidan foydalan."
    )
    user_prompt = (
        f"Quyidagi vakansiya haqida {lang_name} tilida qisqa (3-5 qator) tavsiya "
        "xabari yoz.\n"
        "- Telegram HTML dan foydalan: lavozimni <b>...</b> bilan ajrat.\n"
        "- Ozgina emoji ishlat, lekin haddan oshirma.\n"
        "- Telefon raqam, havola yoki tugma YOZMA (ular alohida qo'shiladi).\n"
        "- Xabarni odam tushunadigan, tabiiy tilda yoz.\n"
        "- Oxirida 'Batafsil ma'lumotni quyidagi tugma orqali ko'rishingiz mumkin' "
        "kabi qisqa chaqiruv qo'sh.\n\n"
        f"VAKANSIYA MA'LUMOTI:\n{facts}"
    )
    try:
        client = get_openai_client()
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.6,
            max_tokens=450,
        )
        text = (response.choices[0].message.content or "").strip()
        return text or None
    except Exception as e:
        logger.warning(f"AI vacancy message generation failed: {e}")
        return None


async def _build_delivery_text(vacancy: Vacancy, lang: str, cache: dict) -> str:
    """Return the message text for a vacancy, generated by AI and cached per
    (vacancy, language) so the same vacancy is not re-generated for every user.
    Falls back to the static template if AI is unavailable.
    """
    key = (vacancy.id, lang)
    if key in cache:
        return cache[key]

    header = _DELIVERY_HEADERS.get(lang, _DELIVERY_HEADERS["uz"])
    ai_body = await _ai_vacancy_message(vacancy, lang)
    if ai_body:
        text = f"<b>{header}</b>\n\n{ai_body}"
    else:
        text = _format_vacancy(vacancy, lang)

    cache[key] = text
    return text


async def _build_keyboard(vacancy: Vacancy):
    from aiogram import types

    buttons = []
    deeplink = _vacancy_deeplink(vacancy.id)
    if deeplink:
        buttons.append(types.InlineKeyboardButton(text="🔎 Batafsil", url=deeplink))
    if vacancy.source_url:
        buttons.append(types.InlineKeyboardButton(text="📩 Bog'lanish", url=vacancy.source_url))
    if not buttons:
        return None
    return types.InlineKeyboardMarkup(inline_keyboard=[buttons])


def _matches_interest(vacancy: Vacancy, interest: Optional[str]) -> bool:
    if not interest:
        return True
    interest = interest.strip().lower()
    if not interest:
        return True
    prof = (vacancy.profession.name_uz if vacancy.profession else "") or ""
    text = f"{prof} {vacancy.company_name} {vacancy.description or ''}".lower()
    # match if any interest word appears
    for word in interest.split():
        if len(word) >= 3 and word in text:
            return True
    return False


async def run_channel_delivery(db, bot) -> int:
    """Send recent channel vacancies to engaged users. Returns messages sent."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=RECENT_WINDOW_HOURS)

    result = await db.execute(
        select(Vacancy)
        .where(
            Vacancy.source_type == "channel",
            Vacancy.status == VacancyStatus.ACTIVE,
            Vacancy.created_at >= cutoff,
        )
        .options(selectinload(Vacancy.profession), selectinload(Vacancy.region))
        .order_by(Vacancy.created_at.desc())
        .limit(50)
    )
    recent_vacancies = result.scalars().all()
    if not recent_vacancies:
        logger.info("Channel delivery: no recent channel vacancies.")
        return 0

    # Engaged users (have a bot profile). Join to get telegram_id + language.
    profiles_result = await db.execute(
        select(BotUserProfile.user_id, BotUserProfile.profession)
    )
    profiles = profiles_result.all()
    if not profiles:
        logger.info("Channel delivery: no engaged users.")
        return 0

    sent = 0
    ai_text_cache: dict = {}
    for user_id, interest in profiles:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user or not user.telegram_id or user.is_blocked:
            continue
        if not str(user.telegram_id).isdigit():
            continue  # skip system/import users

        lang = user.language.value if getattr(user, "language", None) else "uz"

        matched = [v for v in recent_vacancies if _matches_interest(v, interest)][:MAX_PER_USER]
        if not matched:
            matched = recent_vacancies[:1]  # send at least the latest

        for vacancy in matched:
            try:
                kb = await _build_keyboard(vacancy)
                text = await _build_delivery_text(vacancy, lang, ai_text_cache)
                image = _full_image_url(vacancy.image_url)
                if image:
                    await bot.send_photo(
                        chat_id=int(user.telegram_id),
                        photo=image,
                        caption=text[:1024],
                        reply_markup=kb,
                        parse_mode="HTML",
                    )
                else:
                    await bot.send_message(
                        chat_id=int(user.telegram_id),
                        text=text[:4096],
                        reply_markup=kb,
                        disable_web_page_preview=True,
                        parse_mode="HTML",
                    )
                sent += 1
            except Exception as e:
                logger.debug(f"Delivery to {user.telegram_id} failed: {e}")
                break  # likely blocked; stop sending to this user

    logger.info(f"Channel delivery: sent {sent} messages.")
    return sent
