"""Analyze a shared vacancy/resume link with AI.

When a user pastes a vacancy or resume link into the bot, we pull the real
record from the database, compare its salary against similar postings, summarize
its conditions and give a reliability read — all in plain, friendly Uzbek.
"""
import logging
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.resume import Resume, ResumeStatus
from app.services.ai_core import get_openai_client

logger = logging.getLogger(__name__)


async def _ai_text(system_prompt: str, user_prompt: str) -> Optional[str]:
    """Free-text (NOT JSON) completion for human-friendly analysis."""
    if not settings.ai_enabled:
        return None
    try:
        client = get_openai_client()
        resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            max_tokens=700,
        )
        return (resp.choices[0].message.content or "").strip() or None
    except Exception as e:
        logger.warning(f"Link analysis AI call failed: {e}")
        return None


def _fmt_money(value: Optional[int]) -> str:
    if not value:
        return "—"
    return f"{int(value):,}".replace(",", " ") + " so'm"


def _salary_text(salary_from: Optional[int], salary_till: Optional[int]) -> str:
    if salary_from and salary_till:
        return f"{_fmt_money(salary_from)} - {_fmt_money(salary_till)}"
    if salary_from:
        return f"{_fmt_money(salary_from)} dan"
    if salary_till:
        return f"{_fmt_money(salary_till)} gacha"
    return "Kelishiladi"


async def _market_salary(db, profession_id: int) -> dict:
    """Average / min / max salary for active vacancies of the same profession."""
    result = await db.execute(
        select(
            func.avg(Vacancy.salary_from),
            func.min(Vacancy.salary_from),
            func.max(Vacancy.salary_till),
            func.count(Vacancy.id),
        ).where(
            Vacancy.profession_id == profession_id,
            Vacancy.status == VacancyStatus.ACTIVE,
            Vacancy.salary_from.isnot(None),
        )
    )
    avg_from, min_from, max_till, cnt = result.one()
    return {
        "avg_from": int(avg_from) if avg_from else None,
        "min_from": int(min_from) if min_from else None,
        "max_till": int(max_till) if max_till else None,
        "count": int(cnt or 0),
    }


async def analyze_vacancy(db, vacancy_id: int) -> Optional[str]:
    res = await db.execute(
        select(Vacancy).where(Vacancy.id == vacancy_id).options(
            selectinload(Vacancy.profession), selectinload(Vacancy.region)
        )
    )
    v = res.scalar_one_or_none()
    if not v:
        return None

    profession = v.profession.name_uz if v.profession else "—"
    region = v.region.name_uz if v.region else "—"
    market = await _market_salary(db, v.profession_id) if v.profession_id else {}

    # Reliability signals (objective, fed to the AI to reason about)
    signals = []
    signals.append("manba: kanaldan import" if v.source_type == "channel" else "manba: platformada e'lon qilingan")
    signals.append("telefon ko'rsatilgan" if (v.phone and v.phone not in ("-", "")) else "telefon yo'q")
    signals.append("telegram ko'rsatilgan" if v.telegram else "telegram yo'q")
    signals.append("maosh aniq ko'rsatilgan" if (v.salary_from or v.salary_till) else "maosh ko'rsatilmagan")
    signals.append(f"tavsif uzunligi: {len(v.description or '')} belgi")

    market_text = "ma'lumot yetarli emas"
    if market.get("count"):
        market_text = (
            f"shu kasb bo'yicha {market['count']} ta aktiv vakansiya; "
            f"o'rtacha boshlang'ich maosh ~{_fmt_money(market.get('avg_from'))}, "
            f"diapazon {_fmt_money(market.get('min_from'))} - {_fmt_money(market.get('max_till'))}"
        )

    facts = (
        f"Lavozim: {profession}\n"
        f"Kompaniya: {v.company_name}\n"
        f"Hudud: {region}\n"
        f"Maosh: {_salary_text(v.salary_from, v.salary_till)}\n"
        f"Ish turi: {getattr(v.work_type, 'value', v.work_type)} / {getattr(v.work_format, 'value', v.work_format)}\n"
        f"Tavsif: {(v.description or '')[:900]}\n"
        f"Bozor holati: {market_text}\n"
        f"Ishonchlilik signallari: {', '.join(signals)}"
    )

    system_prompt = (
        "Sen ISHKOP ish platformasining tahlilchisisan. Foydalanuvchiga vakansiya "
        "haqida JONLI, o'qishga qulay TAHLIL yozasan. JSON YOZMA, kod bloki ishlatma. "
        "Faqat Telegram HTML matni qaytar: sarlavhalarni <b>...</b> bilan ajrat, "
        "har bo'limni yangi qatordan boshla. Yangi narsa o'ylab topma."
    )
    user_prompt = (
        "Quyidagi vakansiyani tahlil qil va aynan shu tuzilmada yoz (har biri "
        "alohida qatorda, orasida bo'sh qator):\n\n"
        f"<b>💼 {profession} — {v.company_name}</b>\n"
        "📝 <qisqa xulosa, 1-2 jumla>\n"
        "💰 <b>Maosh:</b> <bozorga nisbatan baho: yuqori/o'rtacha/past va sababi>\n"
        "📋 <b>Shartlar:</b> <qisqa talablar>\n"
        "✅ <b>Ishonchlilik:</b> <Ishonchli/O'rtacha/Ehtiyot bo'ling — signallarga qarab + sabab>\n"
        "💡 <b>Maslahat:</b> <1 jumla>\n\n"
        f"MA'LUMOT:\n{facts}"
    )
    ai = await _ai_text(system_prompt, user_prompt)
    if ai:
        return ai
    # Safe non-AI fallback so the user still gets useful info
    return (
        f"<b>💼 {profession} — {v.company_name}</b>\n"
        f"📍 {region}\n"
        f"💰 {_salary_text(v.salary_from, v.salary_till)}\n"
        f"📊 Bozor: {market_text}"
    )


async def analyze_resume(db, resume_id: int) -> Optional[str]:
    res = await db.execute(
        select(Resume).where(Resume.id == resume_id).options(
            selectinload(Resume.profession), selectinload(Resume.region)
        )
    )
    r = res.scalar_one_or_none()
    if not r:
        return None

    profession = r.profession.name_uz if r.profession else "—"
    region = r.region.name_uz if r.region else "—"

    signals = []
    signals.append("telefon ko'rsatilgan" if (r.phone and r.phone not in ("-", "")) else "telefon yo'q")
    signals.append("telegram ko'rsatilgan" if r.telegram else "telegram yo'q")
    signals.append(f"tajriba: {r.experience} yil")
    signals.append(f"tavsif uzunligi: {len(r.description or '')} belgi")

    facts = (
        f"Nomzod: {r.first_name} {r.last_name}\n"
        f"Kasb: {profession}\n"
        f"Hudud: {region}\n"
        f"Yosh: {r.age}\n"
        f"Tajriba: {r.experience} yil\n"
        f"Tavsif: {(r.description or '')[:900]}\n"
        f"Ishonchlilik signallari: {', '.join(signals)}"
    )

    system_prompt = (
        "Sen ISHKOP ish platformasining tahlilchisisan. Ish beruvchiga nomzod "
        "(rezyume) haqida JONLI, o'qishga qulay TAHLIL yozasan. JSON YOZMA, kod "
        "bloki ishlatma. Faqat Telegram HTML matni: <b>...</b> bilan ajrat, har "
        "bo'limni yangi qatordan boshla. Yangi narsa o'ylab topma."
    )
    user_prompt = (
        "Quyidagi nomzodni tahlil qil va aynan shu tuzilmada yoz (har biri alohida "
        "qatorda):\n\n"
        f"<b>🧑‍💼 {r.first_name} {r.last_name} — {profession}</b>\n"
        "📝 <qisqa xulosa, 1-2 jumla>\n"
        "🧰 <b>Kuchli tomonlari:</b> <tajriba, ko'nikma>\n"
        "✅ <b>Ishonchlilik:</b> <Ishonchli/O'rtacha/Ehtiyot bo'ling — signallarga qarab + sabab>\n"
        "💡 <b>Maslahat:</b> <1 jumla>\n\n"
        f"MA'LUMOT:\n{facts}"
    )
    ai = await _ai_text(system_prompt, user_prompt)
    if ai:
        return ai
    return (
        f"<b>🧑‍💼 {r.first_name} {r.last_name} — {profession}</b>\n"
        f"📍 {region} · {r.experience} yil tajriba"
    )


async def analyze_entity(db, kind: str, entity_id: int) -> Optional[str]:
    if kind == "vacancy":
        return await analyze_vacancy(db, entity_id)
    if kind == "resume":
        return await analyze_resume(db, entity_id)
    return None
