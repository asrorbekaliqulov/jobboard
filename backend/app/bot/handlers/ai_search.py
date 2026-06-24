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
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.filters import StateFilter, Command
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.user import User, UserRole
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.resume import Resume, ResumeStatus
from app.models.profession import Profession
from app.bot import memory

from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)
router = Router()


class CVStates(StatesGroup):
    """FSM states for CV creation flow."""
    collecting = State()

# ═══════════════════════════════════════════════════════════════
# SYSTEM PROMPT - ISHKOP Bot shaxsiyati
# ═══════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Sen ISHKOP — O'zbekistonning eng yirik mehnat bozori AI yordamchisisan.
Seni ISHKOP jamoasi yaratgan. Sen ISHKOP platformasining bir qismisan.

ENG MUHIM QOIDA — SHAXSIYAT:
- Agar "seni kim yaratgan?", "qaysi AI san?", "qaysi model?", "ChatGPT misan?", "OpenAI?" deb so'rasalar:
  FAQAT shunday javob ber: "Men ISHKOP platformasining AI yordamchisiman. Meni ISHKOP jamoasi yaratgan."
- HECH QACHON OpenAI, ChatGPT, GPT, Google, boshqa kompaniya yoki model nomini aytma!
- Sen faqat ISHKOP san, boshqa hech narsa emas.

SENING VAZIFALARING (faqat shu mavzular):
1. Ish qidiruvchilarga mos vakansiyalar topish (search_vacancies funksiyasi)
2. Ish beruvchilarga mos ishchilar topish (search_workers funksiyasi)
3. Kasb va maosh bo'yicha maslahat berish
4. ISHKOP platformasi haqida ma'lumot berish
5. Resume/CV yaratishda yordam berish

CONTEXTDAN CHETLASHMA:
- Sen FAQAT ish, kasb, vakansiya, resume, mehnat bozori mavzularida gaplashasan.
- Agar user boshqa mavzu so'rasa (siyosat, din, ob-havo, matematika va h.k.):
  Muloyim qaytar: "Men faqat ish va kasb masalalarida yordam bera olaman. Sizga qanday ish kerak?"

QOIDALAR:
- Har doim O'ZBEK tilida javob ber (agar user rus/ingliz tilida yozmasa)
- Qisqa, aniq va do'stona javob ber
- Oldingi suhbatni eslab tur — user "kecha", "oldin", "yana" desa, avvalgi gaplarni hisobga ol
- User ish qidirsa — search_vacancies, ishchi qidirsa — search_workers chaqir
- MUHIM: Har bir vakansiya/ishchini RO'YXAT qilib qisqacha tavsifi bilan yoz:
  Masalan:
  "1. 💼 <b>Dasturchi</b> — TechWave
   📍 Toshkent | 💰 8-15 mln so'm
   📝 React va Node.js bilan ishlash, 2 yil tajriba kerak

   2. 💼 <b>Backend Developer</b> — IT Solutions
   ..."
- Tavsif (tavsif maydoni) ni qisqa 1-2 jumla qilib yoz
- Oxirida ayt: "Batafsil ko'rish uchun pastdagi tugmalar orqali kiring 👇"
- Telefon raqam yoki havola YOZMA — pastdagi tugmalar buni hal qiladi
- ISHKOP haqida: "ISHKOP — O'zbekistondagi eng yirik ish qidirish platformasi. 8000+ foydalanuvchi, 5000+ vakansiya."
- MUHIM: Agar user O'ZI haqida ma'lumot bersa (ism, kasb, tajriba, yosh, telefon, ko'nikma),
  save_user_info funksiyasi orqali JIMGINA saqlab qo'y. Saqlaganingni AYTMA, oddiy suhbatni davom ettir.
  Hech qachon "ma'lumotingizni so'rashim mumkinmi" deb so'rama — faqat user o'zi aytsa saqla.
- Agar user "menga rezyume/CV yarat", "rezyume tayyorla" desa — create_resume funksiyasini chaqir.
  Avval kasb va asosiy ma'lumotlar bo'lishi kerak. Bo'lmasa, avval qisqa so'ra yoki save_user_info bilan saqla.
"""

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
    },
    {
        "type": "function",
        "function": {
            "name": "save_user_info",
            "description": (
                "Foydalanuvchi O'ZI haqida ma'lumot bersa (ism, kasb, tajriba, yosh, "
                "ko'nikma, telefon, hudud), uni saqlab qo'yish. Faqat user o'zi aytgan "
                "ma'lumotni saqla. Hech qachon o'zing so'rama, faqat user aytsa saqla."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "age": {"type": "integer"},
                    "gender": {"type": "string", "description": "male/female"},
                    "phone": {"type": "string"},
                    "profession": {"type": "string"},
                    "experience_years": {"type": "integer"},
                    "skills": {"type": "string", "description": "vergul bilan ajratilgan"},
                    "region": {"type": "string"},
                    "about": {"type": "string", "description": "o'zi haqida qisqa"},
                    "company_name": {"type": "string"},
                },
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_resume",
            "description": (
                "Foydalanuvchi rezyume/CV yaratib berishni so'rasa (masalan: 'menga rezyume yarat', "
                "'cv kerak', 'rezyume tayyorla'), bu funksiyani chaqir. PDF rezyume yaratiladi. "
                "Avval user haqida yetarli ma'lumot (kamida kasb) bo'lishi kerak — bo'lmasa "
                "avval save_user_info bilan saqla yoki userdan so'ra."
            ),
            "parameters": {"type": "object", "properties": {}},
        }
    }
]

# ═══════════════════════════════════════════════════════════════
# FUNCTION IMPLEMENTATIONS
# ═══════════════════════════════════════════════════════════════

def _vacancy_url(vacancy_id: int) -> str:
    """Deep link to a specific vacancy (job seeker role auto-selected)."""
    # Prefer reliable t.me startapp deep link (works even if webview cached)
    if settings.BOT_USERNAME and settings.MINI_APP_NAME:
        return f"https://t.me/{settings.BOT_USERNAME}/{settings.MINI_APP_NAME}?startapp=vacancy_{vacancy_id}"
    base = settings.MINI_APP_URL.rstrip("/")
    return f"{base}?vacancy={vacancy_id}"


def _resume_url(resume_id: int) -> str:
    """Deep link to a specific resume (employer role auto-selected)."""
    if settings.BOT_USERNAME and settings.MINI_APP_NAME:
        return f"https://t.me/{settings.BOT_USERNAME}/{settings.MINI_APP_NAME}?startapp=resume_{resume_id}"
    base = settings.MINI_APP_URL.rstrip("/")
    return f"{base}?resume={resume_id}"


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
                "tavsif": (v.description or "")[:200],
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
                "tavsif": (r.description or "")[:200],
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


# Context variable to hold current user id during function calling
import contextvars
_current_user_id: contextvars.ContextVar = contextvars.ContextVar("current_user_id", default=None)
# Flag set when AI decides to create a resume during chat
_cv_requested: contextvars.ContextVar = contextvars.ContextVar("cv_requested", default=False)
# Pending photo file_ids awaiting "is this you?" confirmation {telegram_id: file_id}
_pending_photos: dict = {}


async def fn_create_resume() -> str:
    """Mark that a resume should be generated (handled by the message handler)."""
    _cv_requested.set(True)
    return json.dumps({"action": "generate_cv", "status": "tayyorlanmoqda"}, ensure_ascii=False)


async def fn_save_user_info(**kwargs) -> str:
    """Save user-provided info to BotUserProfile (only fields user shared)."""
    from app.models.bot_user_profile import BotUserProfile
    user_id = _current_user_id.get()
    if not user_id:
        return json.dumps({"saved": False}, ensure_ascii=False)

    # Only keep non-empty provided fields
    allowed = {"first_name", "last_name", "age", "gender", "phone",
               "profession", "experience_years", "skills", "region", "about", "company_name"}
    data = {k: v for k, v in kwargs.items() if k in allowed and v not in (None, "", 0)}
    if not data:
        return json.dumps({"saved": False}, ensure_ascii=False)

    async with async_session_maker() as session:
        result = await session.execute(
            select(BotUserProfile).where(BotUserProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if profile:
            for k, v in data.items():
                setattr(profile, k, v)
        else:
            profile = BotUserProfile(user_id=user_id, **data)
            session.add(profile)
        try:
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"save_user_info failed: {e}")
            return json.dumps({"saved": False}, ensure_ascii=False)

    # Silent save - user shouldn't be told explicitly
    return json.dumps({"saved": True}, ensure_ascii=False)


# Function dispatcher
FUNCTION_MAP = {
    "search_vacancies": fn_search_vacancies,
    "search_workers": fn_search_workers,
    "get_salary_info": fn_get_salary_info,
    "save_user_info": fn_save_user_info,
    "create_resume": fn_create_resume,
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


async def _process_with_gpt4o(messages: list) -> tuple:
    """
    Send messages to GPT-4o with function calling.
    Returns (response_text, found_items) where found_items is a list of
    {type, id, title} for building inline webapp buttons.
    """
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    found_items = []

    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0.4,
        max_tokens=1500,
    )

    message = response.choices[0].message

    # Handle function calls
    if message.tool_calls:
        messages.append(message)

        for tool_call in message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            fn = FUNCTION_MAP.get(fn_name)
            if fn:
                result = await fn(**fn_args)
                # Capture found items for button building
                try:
                    parsed = json.loads(result)
                    if "vacancies" in parsed:
                        for v in parsed["vacancies"]:
                            found_items.append({
                                "type": "vacancy",
                                "id": v["id"],
                                "title": f"{v['kasb']} — {v['kompaniya']}",
                            })
                    elif "workers" in parsed:
                        for w in parsed["workers"]:
                            found_items.append({
                                "type": "resume",
                                "id": w["id"],
                                "title": f"{w['ism']} — {w['kasb']}",
                            })
                except Exception:
                    pass
            else:
                result = json.dumps({"error": "Unknown function"})

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

        final_response = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=1500,
        )
        return (final_response.choices[0].message.content or "", found_items)

    # No tool calls — return the direct response
    return (message.content or "", found_items)


async def _stream_gpt4o(messages: list, on_update, edit_interval: float = 1.0) -> tuple:
    """
    Streaming version: streams GPT response and calls on_update(partial_text)
    periodically (real-time typing effect via message editing).
    Returns (full_text, found_items).
    Handles function calling: if functions needed, executes them first (no stream),
    then streams the final answer.
    """
    import time as _time
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    found_items = []

    # Step 1: detect function calls (non-streaming)
    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
        temperature=0.4,
        max_tokens=1500,
    )
    message = response.choices[0].message

    if message.tool_calls:
        messages.append(message)
        for tool_call in message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)
            fn = FUNCTION_MAP.get(fn_name)
            if fn:
                result = await fn(**fn_args)
                try:
                    parsed = json.loads(result)
                    if "vacancies" in parsed:
                        for v in parsed["vacancies"]:
                            found_items.append({"type": "vacancy", "id": v["id"], "title": f"{v['kasb']} — {v['kompaniya']}"})
                    elif "workers" in parsed:
                        for w in parsed["workers"]:
                            found_items.append({"type": "resume", "id": w["id"], "title": f"{w['ism']} — {w['kasb']}"})
                except Exception:
                    pass
            else:
                result = json.dumps({"error": "Unknown function"})
            messages.append({"role": "tool", "tool_call_id": tool_call.id, "content": result})

    # Step 2: stream the final answer
    stream = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=messages,
        temperature=0.4,
        max_tokens=1500,
        stream=True,
    )

    full_text = ""
    last_edit = 0.0
    async for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            full_text += delta
            now = _time.time()
            # Edit message every edit_interval seconds (Telegram rate limit safe)
            if now - last_edit >= edit_interval and len(full_text) > 5:
                last_edit = now
                try:
                    await on_update(full_text + " ▌")
                except Exception:
                    pass

    return (full_text, found_items)

    return (message.content or "", found_items)


def _build_result_buttons(found_items: list) -> Optional[types.InlineKeyboardMarkup]:
    """Build inline buttons for found vacancies/resumes."""
    if not found_items:
        return None

    use_startapp = bool(settings.BOT_USERNAME and settings.MINI_APP_NAME)

    rows = []
    for item in found_items[:8]:  # Max 8 buttons
        if item["type"] == "vacancy":
            url = _vacancy_url(item["id"])
            emoji = "💼"
        else:
            url = _resume_url(item["id"])
            emoji = "👤"
        title = item["title"]
        if len(title) > 40:
            title = title[:37] + "..."

        # t.me startapp links → url button; direct domain → web_app button
        if use_startapp:
            btn = types.InlineKeyboardButton(text=f"{emoji} {title}", url=url)
        else:
            btn = types.InlineKeyboardButton(
                text=f"{emoji} {title}",
                web_app=types.WebAppInfo(url=url),
            )
        rows.append([btn])

    return types.InlineKeyboardMarkup(inline_keyboard=rows)


def _get_webapp_url(query: str = "") -> str:
    import urllib.parse
    base = settings.MINI_APP_URL.rstrip("/")
    if query:
        return f"{base}?search={urllib.parse.quote(query)}"
    return base


@router.message(StateFilter(None), F.text & ~F.text.startswith("/"))
async def handle_text_message(message: types.Message, i18n: I18nContext):
    """Handle text messages - GPT-4o with memory + function calling."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return

    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    tg_id = str(message.from_user.id)

    try:
        _current_user_id.set(user.id)
        _cv_requested.set(False)
        role_context = ""
        if user.role == UserRole.CANDIDATE_HUNTER:
            role_context = "Foydalanuvchi ISH BERUVCHI - u ishchi qidiradi. search_workers funksiyasini ishlat."
        else:
            role_context = "Foydalanuvchi ISH QIDIRUVCHI - u vakansiya qidiradi. search_vacancies funksiyasini ishlat."

        # Build messages with conversation history
        messages = await memory.build_openai_messages(
            tg_id,
            SYSTEM_PROMPT + "\n\n" + role_context,
            message.text,
        )

        # Send initial "typing" message that we'll edit in real-time
        stream_msg = await message.answer("✍️ ...")

        async def _update(partial: str):
            try:
                await stream_msg.edit_text(partial[:4000])
            except Exception:
                pass

        response_text, found_items = await _stream_gpt4o(messages, _update)

        # Check if user is referencing a previous message
        reply_to_id = None
        ref_words = ["kecha", "oldin", "avval", "anaqa", "o'sha", "haligi", "yana o'sha"]
        if any(w in message.text.lower() for w in ref_words):
            prev = await memory.find_message_about(tg_id, message.text)
            if prev:
                reply_to_id = prev.get("message_id")

        # Save user message to memory
        await memory.save_message(tg_id, "user", message.text, message_id=message.message_id)

        # Build result buttons
        result_kb = _build_result_buttons(found_items)
        if not result_kb:
            result_kb = types.InlineKeyboardMarkup(
                inline_keyboard=[[
                    types.InlineKeyboardButton(
                        text="📱 Ilovada ko'rish",
                        web_app=types.WebAppInfo(url=_get_webapp_url(message.text)),
                    )
                ]]
            )

        # Final edit with complete text + buttons
        try:
            sent = await stream_msg.edit_text(
                response_text[:4000],
                reply_markup=result_kb,
                parse_mode="HTML",
            )
        except Exception:
            # If edit fails (e.g. HTML parse), send plain
            sent = await stream_msg.edit_text(response_text[:4000], reply_markup=result_kb)

        # Save assistant response to memory
        await memory.save_message(
            tg_id, "assistant", response_text,
            message_id=stream_msg.message_id,
            summary=message.text[:60],
        )

        # If AI requested a resume, generate and send the PDF
        if _cv_requested.get():
            await _generate_and_send_cv(message, user)

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

        # O'zbek tiliga moslangan, kuchaytirilgan transkripsiya (ai_core)
        from app.services.ai_core import transcribe_audio
        text = await transcribe_audio(voice_data)
        if not text:
            await status_msg.edit_text("🎤 Ovozingizni tushunib bo'lmadi.")
            return

        await status_msg.edit_text(f"🎤 \"{text}\"\n\n⏳ Javob tayyorlanmoqda...")

        tg_id = str(message.from_user.id)
        _current_user_id.set(user.id)

        # Process with GPT-4o (with memory)
        role_context = ""
        if user.role == UserRole.CANDIDATE_HUNTER:
            role_context = "Foydalanuvchi ISH BERUVCHI. search_workers ishlat."
        else:
            role_context = "Foydalanuvchi ISH QIDIRUVCHI. search_vacancies ishlat."

        messages = await memory.build_openai_messages(
            tg_id,
            SYSTEM_PROMPT + "\n\n" + role_context,
            text,
        )

        response_text, found_items = await _process_with_gpt4o(messages)

        # Save to memory
        await memory.save_message(tg_id, "user", text, message_id=message.message_id)

        result_kb = _build_result_buttons(found_items)
        if not result_kb:
            result_kb = types.InlineKeyboardMarkup(
                inline_keyboard=[[
                    types.InlineKeyboardButton(
                        text="📱 Ilovada ko'rish",
                        web_app=types.WebAppInfo(url=_get_webapp_url(text)),
                    )
                ]]
            )

        sent = await status_msg.edit_text(response_text, reply_markup=result_kb, parse_mode="HTML")
        await memory.save_message(
            tg_id, "assistant", response_text,
            message_id=sent.message_id if hasattr(sent, "message_id") else None,
            summary=text[:60],
        )

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

        # Ask GPT-4o vision to analyze and detect if it's a person
        analysis_messages = [
            {"role": "system", "content": (
                "Sen rasm tahlilchisisan. Rasmni ko'rib JSON qaytar: "
                '{"type": "person/document/other", "is_person": true/false, '
                '"description": "rasm haqida qisqa o\'zbekcha", '
                '"resume_text": "agar bu CV/resume bo\'lsa undagi matn, aks holda null"}'
            )},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": message.caption or "Bu rasmni tahlil qil."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                ],
            },
        ]

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=analysis_messages,
            max_tokens=1500,
            response_format={"type": "json_object"},
        )

        import json as _json
        result = _json.loads(response.choices[0].message.content or "{}")
        is_person = result.get("is_person", False)
        description = result.get("description", "Rasmni tahlil qildim.")
        resume_text = result.get("resume_text")

        if is_person:
            # Ask if this is the user (to save for future resumes)
            _pending_photos[str(message.from_user.id)] = photo.file_id
            kb = types.InlineKeyboardMarkup(inline_keyboard=[[
                types.InlineKeyboardButton(text="✅ Ha, bu men", callback_data="photo_yes"),
                types.InlineKeyboardButton(text="❌ Yo'q", callback_data="photo_no"),
            ]])
            await status_msg.edit_text(
                f"🖼 {description}\n\n👤 Bu rasmda inson bor. <b>Bu sizmi?</b>\n"
                "Agar ha bo'lsa, rezyumengizga qo'shib qo'yaman.",
                reply_markup=kb, parse_mode="HTML",
            )
        elif resume_text:
            # It's a CV/document - extract info and save
            await status_msg.edit_text(f"📄 Bu hujjatdan ma'lumotlarni o'qidim:\n\n{resume_text[:1500]}", parse_mode="HTML")
        else:
            await status_msg.edit_text(f"🖼 {description}", parse_mode="HTML")

    except Exception as e:
        logger.error(f"GPT-4o photo error: {e}")
        await status_msg.edit_text("❌ Rasmni tahlil qilib bo'lmadi.")


@router.callback_query(F.data == "photo_yes")
async def photo_confirm_yes(callback: types.CallbackQuery):
    """User confirmed the photo is theirs - save to profile."""
    tg_id = str(callback.from_user.id)
    file_id = _pending_photos.pop(tg_id, None)
    user = await _get_user(tg_id)
    if file_id and user:
        from app.models.bot_user_profile import BotUserProfile
        async with async_session_maker() as session:
            res = await session.execute(
                select(BotUserProfile).where(BotUserProfile.user_id == user.id)
            )
            profile = res.scalar_one_or_none()
            if profile:
                profile.photo_file_id = file_id
            else:
                session.add(BotUserProfile(user_id=user.id, photo_file_id=file_id))
            await session.commit()
    await callback.message.edit_text("✅ Rasm saqlandi! Rezyumengizga qo'shaman.")
    await callback.answer()


@router.callback_query(F.data == "photo_no")
async def photo_confirm_no(callback: types.CallbackQuery):
    """User said photo isn't theirs - discard."""
    _pending_photos.pop(str(callback.from_user.id), None)
    await callback.message.edit_text("Tushunarli, rasmni saqlamadim.")
    await callback.answer()


@router.message(F.document)
async def handle_document_message(message: types.Message, i18n: I18nContext):
    """
    Handle PDF documents: extract text, read caption, let AI edit/recreate CV.
    User can send a CV + caption like 'shuni mana shu qismini o'zgartir' or
    'mana shu dizaynda menga cv qil'.
    """
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return
    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    doc = message.document
    if doc.file_size and doc.file_size > 5 * 1024 * 1024:
        await message.answer("❌ Fayl juda katta (max 5MB)")
        return

    is_pdf = (doc.mime_type == "application/pdf") or (doc.file_name or "").lower().endswith(".pdf")
    if not is_pdf:
        await message.answer("📄 Hozircha faqat PDF fayllarni o'qiy olaman.")
        return

    caption = (message.caption or "").strip()
    status = await message.answer("📄 Hujjat o'qilmoqda...")

    try:
        # Download and extract text
        file = await message.bot.get_file(doc.file_id)
        buf = BytesIO()
        await message.bot.download_file(file.file_path, buf)
        buf.seek(0)

        from app.services.pdf_resume import extract_pdf_text, generate_resume_pdf
        pdf_text = extract_pdf_text(buf.read())

        if not pdf_text:
            await status.edit_text("❌ PDF dan matn o'qib bo'lmadi. Balki rasm ko'rinishidagi PDF.")
            return

        # Daily limit check (editing also counts)
        tg_id = str(message.from_user.id)
        if not await memory.can_generate_cv(tg_id):
            await status.edit_text(
                f"⛔ Kunlik rezyume limiti tugadi ({memory.DAILY_CV_LIMIT} ta/kun). Ertaga urinib ko'ring."
            )
            return

        await status.edit_text("🤖 AI hujjatni qayta ishlamoqda...")

        # AI: process the CV + user's instruction
        instruction = caption or "Bu rezyumeni ISHKOP dizaynida professional qilib qayta yarat."
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        ai_resp = await client.chat.completions.create(
            model=settings.OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": (
                    "Sen rezyume muharririsan. Mavjud rezyume matni va foydalanuvchi ko'rsatmasi beriladi. "
                    "Ko'rsatmaga qarab rezyumeni TAHRIRLA — faqat aytilgan qismni o'zgartir, qolganini saqla. "
                    "BIRINCHI SHAXSDA yoz (men, mening). JSON qaytar."
                )},
                {"role": "user", "content": (
                    f"Mavjud rezyume:\n{pdf_text[:3000]}\n\n"
                    f"Foydalanuvchi ko'rsatmasi: \"{instruction}\"\n\n"
                    "Format: {\"full_name\":\"\",\"profession\":\"\",\"age\":null,\"experience\":null,"
                    "\"phone\":\"\",\"region\":\"\",\"summary\":\"men haqimda\","
                    "\"experience_details\":\"\",\"skills\":[\"k1\"]}"
                )},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        import json as _json
        data = _json.loads(ai_resp.choices[0].message.content or "{}")

        pdf_io = generate_resume_pdf({
            "full_name": data.get("full_name") or "Nomzod",
            "profession": data.get("profession", ""),
            "age": data.get("age"),
            "experience": data.get("experience"),
            "phone": data.get("phone", ""),
            "telegram": (user.username and f"@{user.username}") or "",
            "region": data.get("region", ""),
            "summary": data.get("summary", ""),
            "experience_details": data.get("experience_details", ""),
            "skills": data.get("skills", []),
        })
        if not pdf_io:
            await status.edit_text("❌ PDF yaratishda xatolik.")
            return

        await status.delete()
        out_doc = types.BufferedInputFile(pdf_io.read(), filename="rezyume_yangilangan.pdf")
        await message.answer_document(out_doc, caption="✅ Tayyor! Mana yangilangan rezyumengiz.")
        new_count = await memory.increment_cv_count(tg_id)
        remaining = max(0, memory.DAILY_CV_LIMIT - new_count)
        await message.answer(f"ℹ️ Bugun yana {remaining} ta rezyume yaratishingiz mumkin.")

    except Exception as e:
        logger.error(f"Document handler error: {e}")
        await status.edit_text("❌ Hujjatni qayta ishlashda xatolik.")



# ═══════════════════════════════════════════════════════════════
# /clear command - reset conversation memory
# ═══════════════════════════════════════════════════════════════


@router.message(Command("clear"))
async def handle_clear(message: types.Message, i18n: I18nContext):
    """Clear conversation history."""
    await memory.clear_history(str(message.from_user.id))
    await message.answer("🗑 Suhbat tarixi tozalandi. Yangi suhbat boshlashingiz mumkin.")


@router.message(Command("cv"))
async def handle_cv(message: types.Message, state: "FSMContext", i18n: I18nContext):
    """Start CV creation: show current info, ask for additions."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await message.answer("Iltimos, avval /start buyrug'ini yuboring.")
        return
    if not settings.ai_enabled:
        await message.answer("AI xizmati hozirda ishlamayapti.")
        return

    from app.models.bot_user_profile import BotUserProfile
    async with async_session_maker() as session:
        result = await session.execute(
            select(BotUserProfile).where(BotUserProfile.user_id == user.id)
        )
        profile = result.scalar_one_or_none()

    # Show current info
    lines = ["📄 <b>Rezyume yaratish boshlandi</b>\n", "Menda siz haqingizda quyidagi ma'lumotlar bor:\n"]
    if profile:
        if profile.first_name or profile.last_name:
            lines.append(f"👤 Ism: {profile.first_name or ''} {profile.last_name or ''}".strip())
        if profile.age:
            lines.append(f"🎂 Yosh: {profile.age}")
        if profile.profession:
            lines.append(f"💼 Kasb: {profile.profession}")
        if profile.experience_years is not None:
            lines.append(f"🧠 Tajriba: {profile.experience_years} yil")
        if profile.skills:
            lines.append(f"🛠 Ko'nikmalar: {profile.skills}")
        if profile.region:
            lines.append(f"📍 Hudud: {profile.region}")
        if profile.phone:
            lines.append(f"📞 Telefon: {profile.phone}")
        if profile.about:
            lines.append(f"📝 {profile.about}")
    if len(lines) <= 2:
        lines.append("<i>(hozircha ma'lumot yo'q)</i>")

    lines.append("\n➕ Yana qo'shimcha ma'lumot kiritasizmi?")
    lines.append("Agar shu ma'lumotlar bilan yaratsam — <b>\"Yarat\"</b> deb yozing.")

    await state.set_state(CVStates.collecting)
    await message.answer("\n".join(lines), parse_mode="HTML")


@router.message(StateFilter(CVStates.collecting))
async def handle_cv_collecting(message: types.Message, state: "FSMContext", i18n: I18nContext):
    """Handle user response during CV creation."""
    user = await _get_user(str(message.from_user.id))
    if not user:
        await state.clear()
        return

    text = (message.text or "").strip().lower()

    # User wants to generate now
    generate_words = ["yarat", "boshla", "tayyorla", "shu bilan", "yetarli", "bo'ldi", "ha yarat", "davom"]
    if any(w in text for w in generate_words) and len(text) < 30:
        await state.clear()
        await _generate_and_send_cv(message, user)
        return

    # Off-topic detection: if it looks like a question/different topic, exit CV mode
    offtopic_markers = ["?", "qancha", "qayerda", "nima uchun", "kim", "ob-havo", "vaqt"]
    is_question = any(m in text for m in offtopic_markers)

    # Otherwise treat as additional info → save it via AI extraction
    if message.text and not is_question:
        # Save the new info using AI
        try:
            _current_user_id.set(user.id)
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            extract = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Foydalanuvchi gapidan rezyume ma'lumotlarini ajrat. JSON qaytar."},
                    {"role": "user", "content": (
                        f"Gap: \"{message.text}\"\n"
                        "Format: {\"first_name\":null,\"last_name\":null,\"age\":null,\"gender\":null,"
                        "\"phone\":null,\"profession\":null,\"experience_years\":null,\"skills\":null,"
                        "\"region\":null,\"about\":null}. Faqat aytilganlarni to'ldir, qolganini null qoldir."
                    )},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            import json as _json
            extracted = _json.loads(extract.choices[0].message.content or "{}")
            await fn_save_user_info(**extracted)
            await message.answer("✅ Qo'shildi! Yana qo'shasizmi yoki <b>\"Yarat\"</b> deb yozing?", parse_mode="HTML")
        except Exception as e:
            logger.error(f"CV collect error: {e}")
            await message.answer("Yana ma'lumot qo'shing yoki \"Yarat\" deb yozing.")
    else:
        # Off-topic → exit CV mode and answer normally
        await state.clear()
        await message.answer("Rezyume yaratish to'xtatildi. Savolingizga javob beraman 👇")
        # Re-process as normal message
        await handle_text_message(message, i18n)


async def _generate_and_send_cv(message: types.Message, user) -> None:
    """Generate and send the PDF CV from saved profile."""
    tg_id = str(message.from_user.id)
    # Daily limit check (3/day)
    if not await memory.can_generate_cv(tg_id):
        await message.answer(
            f"⛔ Kunlik rezyume yaratish limiti tugadi ({memory.DAILY_CV_LIMIT} ta/kun).\n"
            "Ertaga qayta urinib ko'ring."
        )
        return

    status = await message.answer("📄 Rezyumengiz tayyorlanmoqda...")
    try:
        from app.models.bot_user_profile import BotUserProfile
        async with async_session_maker() as session:
            result = await session.execute(
                select(BotUserProfile).where(BotUserProfile.user_id == user.id)
            )
            profile = result.scalar_one_or_none()

        if not profile or not (profile.profession or profile.about or profile.first_name):
            await status.edit_text(
                "📄 Rezyume uchun ma'lumot yetarli emas. O'zingiz haqingizda gapirib bering."
            )
            return

        profile_text = (
            f"Ism: {profile.first_name or ''} {profile.last_name or ''}\n"
            f"Yosh: {profile.age or ''}\n"
            f"Kasb: {profile.profession or ''}\n"
            f"Tajriba: {profile.experience_years or ''} yil\n"
            f"Ko'nikmalar: {profile.skills or ''}\n"
            f"Hudud: {profile.region or ''}\n"
            f"Telefon: {profile.phone or ''}\n"
            f"O'zi haqida: {profile.about or ''}"
        )

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        ai_resp = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": (
                    "Sen professional rezyume tuzuvchisan. O'zbek tilida, BIRINCHI SHAXSDA yoz "
                    "(men, mening). 'Men 5 yil ishladim'. Uchinchi shaxsda yozma! JSON qaytar."
                )},
                {"role": "user", "content": (
                    f"Ma'lumotlar:\n{profile_text}\n\n"
                    "Format: {\"summary\":\"men haqimda\",\"experience_details\":\"mening tajribam\",\"skills\":[\"k1\"]}"
                )},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        import json as _json
        ai_data = _json.loads(ai_resp.choices[0].message.content or "{}")

        from app.services.pdf_resume import generate_resume_pdf
        full_name = f"{profile.first_name or ''} {profile.last_name or ''}".strip() or "Nomzod"
        pdf_data = {
            "full_name": full_name,
            "profession": profile.profession or "",
            "age": profile.age,
            "experience": profile.experience_years,
            "phone": profile.phone or "",
            "telegram": (user.username and f"@{user.username}") or "",
            "region": profile.region or "",
            "summary": ai_data.get("summary", profile.about or ""),
            "experience_details": ai_data.get("experience_details", ""),
            "skills": ai_data.get("skills", (profile.skills or "").split(",") if profile.skills else []),
        }

        pdf_io = generate_resume_pdf(pdf_data)
        if not pdf_io:
            await status.edit_text("❌ PDF yaratishda xatolik.")
            return

        # Save CV to storage for WebApp form pre-fill
        try:
            from app.services.storage import upload_file
            import time as _t
            pdf_io.seek(0)
            cv_url = upload_file(
                pdf_io,
                prefix="cv",
                filename=f"cv_{user.id}_{int(_t.time())}.pdf",
                content_type="application/pdf",
            )
            async with async_session_maker() as session2:
                res2 = await session2.execute(
                    select(BotUserProfile).where(BotUserProfile.user_id == user.id)
                )
                p2 = res2.scalar_one_or_none()
                if p2:
                    p2.cv_url = cv_url
                    await session2.commit()
        except Exception as e:
            logger.error(f"CV upload failed: {e}")

        await status.delete()
        pdf_io.seek(0)
        doc = types.BufferedInputFile(pdf_io.read(), filename=f"{full_name}_rezyume.pdf")
        await message.answer_document(
            doc,
            caption="📄 Mana sizning professional rezyumengiz!\n\n"
                    "✅ Bu rezyume saqlandi — ilovada rezyume yaratganda avtomatik yuklanadi.\n\n"
                    "ISHKOP orqali ish toping 🚀",
        )
        # Count this generation toward the daily limit
        new_count = await memory.increment_cv_count(str(message.from_user.id))
        remaining = max(0, memory.DAILY_CV_LIMIT - new_count)
        await message.answer(f"ℹ️ Bugun yana {remaining} ta rezyume yaratishingiz mumkin.")
    except Exception as e:
        logger.error(f"CV generation error: {e}")
        await status.edit_text("❌ Rezyume yaratishda xatolik. Qayta urinib ko'ring.")
