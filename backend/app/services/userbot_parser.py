"""
AI parser: converts a Telegram channel post into a structured vacancy dict.

It also maps the parsed free-text profession/region to existing DB rows
(profession_id, region_id) so the vacancy can be stored in the existing
`vacancies` table without touching its schema. Non-vacancy posts are skipped.
"""
import logging
import re
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Region
from app.models.profession import Profession
from app.models.vacancy import WorkFormat, WorkType
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


PARSE_INSTRUCTIONS = """Quyidagi Telegram post matnini tahlil qil.

Avval aniqla: bu ISH VAKANSIYASI (ishchi/hodim kerak) emi yoki yo'q.
Agar vakansiya BO'LMASA quyidagini qaytar: {"is_vacancy": false}

Agar VAKANSIYA bo'lsa, quyidagi JSON ni qaytar:
{
  "is_vacancy": true,
  "company_name": "Idora yoki kompaniya nomi (bo'lmasa 'Aniqlanmagan')",
  "profession": "Lavozim/kasb nomi qisqa (masalan: 'Dasturchi', 'Oshpaz', 'Haydovchi')",
  "region": "Hudud/shahar nomi (masalan: 'Toshkent', 'Samarqand'); bo'lmasa null",
  "description": "Texnologiya, talablar va qo'shimcha ma'lumotlar asosida toza, chiroyli ish tavsifi (3-8 jumla). Emoji ishlatma.",
  "salary_from": "minimal maosh raqamda so'mda (masalan 9mln -> 9000000); bo'lmasa null",
  "salary_till": "maksimal maosh raqamda so'mda; bo'lmasa null",
  "work_format": "'remote' (masofaviy) yoki 'onsite' (ofisda); aniq bo'lmasa 'onsite'",
  "work_type": "'fulltime' yoki 'part-time'; aniq bo'lmasa 'fulltime'",
  "telegram": "bog'lanish uchun telegram username @ siz (masalan 'ustoz_sheefoo'); bo'lmasa null",
  "phone": "telefon raqam; bo'lmasa null"
}

Faqat JSON qaytar. Post matni:
"""


def _to_int_salary(value) -> Optional[int]:
    """Parse salary value like '9mln', '9 000 000', 9000000 into int so'm."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        v = int(value)
        return v if v > 0 else None
    s = str(value).lower().strip()
    if not s or s in ("null", "none", "kelishiladi"):
        return None
    # detect millions
    mln = "mln" in s or "million" in s or "млн" in s
    ming = ("ming" in s or "тыс" in s) and not mln
    digits = re.sub(r"[^\d.]", "", s.replace(",", "."))
    if not digits:
        return None
    try:
        num = float(digits)
    except ValueError:
        return None
    if mln:
        num *= 1_000_000
    elif ming:
        num *= 1_000
    result = int(num)
    return result if result > 0 else None


def _clean(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    t = str(text).strip()
    if not t or t.lower() in ("null", "none", "aniqlanmagan", "-"):
        return None
    return t


async def parse_channel_post(text: str) -> Optional[dict]:
    """
    Returns a normalized vacancy dict if the post is a vacancy, else None.
    The dict has keys: company_name, profession, region, description,
    salary_from, salary_till, work_format, work_type, telegram, phone.
    """
    if not text or len(text.strip()) < 20:
        return None

    try:
        raw = await ai_chat_completion(
            feature="channel_parser",
            user_message=PARSE_INSTRUCTIONS + text[:4000],
            temperature=0.1,
            max_tokens=1200,
            response_format="json",
        )
        data = parse_ai_json(raw)
    except Exception as e:
        logger.warning(f"Channel post AI parse failed: {e}")
        return None

    if not isinstance(data, dict) or not data.get("is_vacancy"):
        return None

    description = _clean(data.get("description")) or text[:1900]
    company = _clean(data.get("company_name")) or "Telegram kanal"

    wf = str(data.get("work_format") or "onsite").lower()
    work_format = WorkFormat.REMOTE if "remote" in wf or "masofa" in wf else WorkFormat.ONSITE
    wt = str(data.get("work_type") or "fulltime").lower()
    work_type = WorkType.PART_TIME if "part" in wt else WorkType.FULLTIME

    return {
        "company_name": company[:255],
        "profession": _clean(data.get("profession")),
        "region": _clean(data.get("region")),
        "description": description[:1990],
        "salary_from": _to_int_salary(data.get("salary_from")),
        "salary_till": _to_int_salary(data.get("salary_till")),
        "work_format": work_format,
        "work_type": work_type,
        "telegram": (_clean(data.get("telegram")) or "").lstrip("@") or None,
        "phone": _clean(data.get("phone")),
    }


async def resolve_profession_id(db: AsyncSession, name: Optional[str]) -> Optional[int]:
    """Find best-matching profession id; fallback to 'Boshqa' or any profession."""
    if name:
        nm = name.strip().lower()
        # exact-ish match on any locale
        result = await db.execute(
            select(Profession.id).where(
                func.lower(Profession.name_uz) == nm
            ).limit(1)
        )
        pid = result.scalar_one_or_none()
        if pid:
            return pid
        # partial match
        like = f"%{nm}%"
        result = await db.execute(
            select(Profession.id).where(
                func.lower(Profession.name_uz).like(like)
            ).limit(1)
        )
        pid = result.scalar_one_or_none()
        if pid:
            return pid

    # fallback: "Boshqa"
    result = await db.execute(
        select(Profession.id).where(func.lower(Profession.name_uz) == "boshqa").limit(1)
    )
    pid = result.scalar_one_or_none()
    if pid:
        return pid
    # last resort: any profession
    result = await db.execute(select(Profession.id).limit(1))
    return result.scalar_one_or_none()


async def resolve_region_id(db: AsyncSession, name: Optional[str]) -> Optional[int]:
    """Find best-matching region id; fallback to Toshkent or any region."""
    if name:
        nm = name.strip().lower()
        like = f"%{nm.split()[0]}%" if nm else "%"
        result = await db.execute(
            select(Region.id).where(func.lower(Region.name_uz).like(like)).limit(1)
        )
        rid = result.scalar_one_or_none()
        if rid:
            return rid

    result = await db.execute(
        select(Region.id).where(func.lower(Region.name_uz).like("%toshkent%")).limit(1)
    )
    rid = result.scalar_one_or_none()
    if rid:
        return rid
    result = await db.execute(select(Region.id).limit(1))
    return result.scalar_one_or_none()
