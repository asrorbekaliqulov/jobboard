"""
Bot profil sinxronizatsiyasi.

Foydalanuvchi WebApp orqali rezyume yaratganda, o'sha ma'lumotlarni
JIMGINA (userga bildirmasdan) `bot_user_profiles` jadvaliga ham saqlaymiz.
Keyinchalik bot bilan suhbatda yoki yangi forma to'ldirishda AI shu
ma'lumotlardan foydalanadi.

MUHIM:
- Faqat YANGI alohida `bot_user_profiles` jadvaliga yoziladi.
- Mavjud `resumes`/`users` jadvallariga TEGILMAYDI.
- Hech qachon rezyume yaratish jarayonini buzmasligi kerak (try/except).
"""
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.bot_user_profile import BotUserProfile

logger = logging.getLogger(__name__)


def _safe_str(value) -> Optional[str]:
    """Enum yoki boshqa qiymatni xavfsiz stringga aylantiradi."""
    if value is None:
        return None
    # Enum bo'lsa .value ni olamiz (masalan Gender.MALE -> "male")
    val = getattr(value, "value", value)
    val = str(val).strip()
    return val or None


async def sync_resume_to_bot_profile(db: AsyncSession, resume) -> None:
    """
    Yaratilgan rezyume ma'lumotlarini bot_user_profiles ga upsert qiladi.
    Faqat bo'sh bo'lmagan maydonlar yoziladi. Xatolik bo'lsa, jimgina o'tadi.
    """
    try:
        user_id = getattr(resume, "user_id", None)
        if not user_id:
            return

        profession_name = None
        if getattr(resume, "profession", None) is not None:
            profession_name = getattr(resume.profession, "name_uz", None)

        region_name = None
        if getattr(resume, "region", None) is not None:
            region_name = getattr(resume.region, "name_uz", None)

        full_first = _safe_str(getattr(resume, "first_name", None))
        full_last = _safe_str(getattr(resume, "last_name", None))

        candidate = {
            "first_name": full_first,
            "last_name": full_last,
            "age": getattr(resume, "age", None) or None,
            "gender": _safe_str(getattr(resume, "gender", None)),
            "phone": _safe_str(getattr(resume, "phone", None)),
            "telegram": _safe_str(getattr(resume, "telegram", None)),
            "profession": _safe_str(profession_name),
            "experience_years": getattr(resume, "experience", None),
            "region": _safe_str(region_name),
            "about": _safe_str(getattr(resume, "description", None)),
        }
        # Faqat to'ldirilgan maydonlar
        data = {k: v for k, v in candidate.items() if v not in (None, "")}
        if not data:
            return

        result = await db.execute(
            select(BotUserProfile).where(BotUserProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            for k, v in data.items():
                setattr(profile, k, v)
        else:
            profile = BotUserProfile(user_id=user_id, **data)
            db.add(profile)

        await db.commit()
    except Exception as e:  # pragma: no cover - hech qachon asosiy oqimni buzmaydi
        logger.warning(f"sync_resume_to_bot_profile failed (silently ignored): {e}")
        try:
            await db.rollback()
        except Exception:
            pass
