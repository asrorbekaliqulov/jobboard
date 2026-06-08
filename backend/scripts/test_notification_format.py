
import asyncio
import html
import re
from unittest.mock import MagicMock, AsyncMock
from enum import Enum

# Fully Mocked Structures to avoid import issues
class UserLanguage(str, Enum):
    UZ = "uz"
    RU = "ru"
    EN = "en"

class WorkType(str, Enum):
    FULLTIME = "fulltime"
    PART_TIME = "part-time"

class WorkFormat(str, Enum):
    ONSITE = "onsite"
    REMOTE = "remote"

class MockObj:
    pass

# Mock Service Logic (copied from notification.py for verification)
class NotificationService:
    def __init__(self, bot, redis):
        pass

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
        safe_text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe_text)

        # 3. Parse Italic (__text__) - not strictly requested but helpful
        # safe_text = re.sub(r'\_\_(.+?)\_\_', r'<i>\1</i>', safe_text) 
        
        return safe_text

    async def _send_message(self, db, user_id, telegram_id, text, kb=None):
        pass

    def _format_salary(self, salary_from: int | None, salary_till: int | None, lang: UserLanguage) -> str:
        s_currency = "so‘m"
        s_negotiable = {
            UserLanguage.UZ: "Kelishiladi",
            UserLanguage.RU: "Договорная",
            UserLanguage.EN: "Negotiable"
        }
        s_from = {
            UserLanguage.UZ: "dan boshlab",
            UserLanguage.RU: "от",
            UserLanguage.EN: "starting from"
        }
        s_till = {
            UserLanguage.UZ: "gacha",
            UserLanguage.RU: "до",
            UserLanguage.EN: "up to"
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

service = NotificationService(None, None)

def create_mock_vacancy(lang: UserLanguage):
    v = MockObj()
    v.company_name = "Tech_Corp & Sons" # Test escaping
    v.salary_from = 8000000
    v.salary_till = 12000000
    v.work_type = WorkType.FULLTIME
    v.work_format = WorkFormat.REMOTE
    # Test Mixed content: Markdown bold, Underscore (should be preserved or safe), HTML Tag (should be escaped)
    v.description = "React / JavaScript\n1+ yil tajriba\n**Must know React**\nNB: This is a test with_underscore, <script>alert('xss')</script> and *unclosed asterisk"
    v.phone = "+998 90 123 45 67"
    v.telegram = "@techrecruiter"
    v.email = "hr@techcorp.com"
    v.profession = MockObj()
    v.profession.name_uz = "Frontend dasturchi"
    v.profession.name_ru = "Frontend разработчик"
    v.profession.name_en = "Frontend Developer"
    v.region = MockObj()
    v.region.name_uz = "Toshkent"
    v.region.name_ru = "Ташкент"
    v.region.name_en = "Tashkent"
    return v

def create_mock_resume(lang: UserLanguage):
    r = MockObj()
    r.experience = 2
    r.description = "React, JS, HTML, CSS & **Best Practices** <tags>"
    r.phone = "+998 93 765 43 21"
    r.telegram = "@frontend_dev"
    r.email = "dev@mail.com"
    r.profession = MockObj()
    r.profession.name_uz = "Frontend dasturchi"
    r.profession.name_ru = "Frontend разработчик"
    r.profession.name_en = "Frontend Developer"
    r.profession.category = MockObj()
    r.profession.category.name_uz = "Web Dasturlash"
    r.profession.category.name_ru = "Веб Разработка"
    r.profession.category.name_en = "Web Development"
    r.region = MockObj()
    r.region.name_uz = "Toshkent"
    r.region.name_ru = "Ташкент"
    r.region.name_en = "Tashkent"
    return r

async def test_formatting():
    # VACANCY logic
    print("--- Testing Vacancy Notification ---")
    for lang in [UserLanguage.UZ, UserLanguage.RU, UserLanguage.EN]:
        print(f"\n[Language: {lang.value}]")
        vacancy = create_mock_vacancy(lang)
        
        prof_name = getattr(vacancy.profession, f"name_{lang.value}", vacancy.profession.name_uz)
        region_name = getattr(vacancy.region, f"name_{lang.value}", vacancy.region.name_uz)
        salary_text = service._format_salary(vacancy.salary_from, vacancy.salary_till, lang)
        
        wt_map = {
            "fulltime": {"uz": "To‘liq stavka", "ru": "Полная занятость", "en": "Full-time"},
            "part-time": {"uz": "Yarim stavka", "ru": "Частичная занятость", "en": "Part-time"}
        }
        wf_map = {
            "onsite": {"uz": "Ofis", "ru": "Офис", "en": "On-site"},
            "remote": {"uz": "Masofaviy", "ru": "Удаленно", "en": "Remote"}
        }

        w_type = wt_map.get(vacancy.work_type.value, {}).get(lang.value, vacancy.work_type.value)
        w_format = wf_map.get(vacancy.work_format.value, {}).get(lang.value, vacancy.work_format.value)
        work_details = f"{w_type} / {w_format}"

        contacts = []
        if vacancy.phone: contacts.append(f"📱 {html.escape(vacancy.phone)}")
        if vacancy.telegram: contacts.append(f"💬 {html.escape(vacancy.telegram)}")
        if vacancy.email: contacts.append(f"📧 {html.escape(vacancy.email)}")
        contact_block = "\n".join(contacts)
        
        # Escape dynamic content
        prof_name_esc = html.escape(prof_name)
        comp_name_esc = html.escape(vacancy.company_name)
        region_name_esc = html.escape(region_name)
        
        # Parse description
        desc_formatted = service._parse_markdown_text(vacancy.description)

        text = ""
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
            if contact_block: text += f"📞 Contact:\n{contact_block}"
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
             if contact_block: text += f"📞 Контакты:\n{contact_block}"
        else: # UZ
            text = (
                f"🔔 <b>Sizga mos Vakansiya topildi!</b>\n\n"
                f"💼 Lavozim: <b>{prof_name_esc}</b>\n"
                f"🏢 Kompaniya: <b>{comp_name_esc}</b>\n"
                f"📍 Manzil: <b>{region_name_esc}</b>\n"
                f"💰 Maosh: {salary_text}\n"
                f"🕒 Ish turi: {work_details}\n\n"
                f"📝 Talablar: {desc_formatted}\n\n"
            )
            if contact_block: text += f"📞 Bog‘lanish uchun:\n{contact_block}"
            
        print(text)

    # RESUME logic
    print("\n\n--- Testing Resume Notification ---")
    for lang in [UserLanguage.UZ, UserLanguage.RU, UserLanguage.EN]:
        print(f"\n[Language: {lang.value}]")
        resume = create_mock_resume(lang)
        
        prof_name = getattr(resume.profession, f"name_{lang.value}", resume.profession.name_uz)
        
        # Category Mocking for script
        cat_name = "Unknown"
        if resume.profession.category:
            cat_name = getattr(resume.profession.category, f"name_{lang.value}", resume.profession.category.name_uz)
            
        region_name = getattr(resume.region, f"name_{lang.value}", resume.region.name_uz)

        contacts = []
        if resume.phone: contacts.append(f"📱 {html.escape(resume.phone)}")
        if resume.telegram: contacts.append(f"💬 {html.escape(resume.telegram)}")
        if resume.email: contacts.append(f"📧 {html.escape(resume.email)}")
        contact_block = "\n".join(contacts)

        # Escape fields
        prof_name_esc = html.escape(prof_name)
        cat_name_esc = html.escape(cat_name)
        region_name_esc = html.escape(region_name)
        
        # Parse description
        desc_formatted = service._parse_markdown_text(resume.description)

        text = ""
        if lang == UserLanguage.EN:
            text = (
                f"🔔 <b>New Talent Found!</b>\n\n"
                f"👤 Specialist: <b>{prof_name_esc}</b>\n"
                f"🎯 Direction: <b>{cat_name_esc}</b>\n"
                f"🧠 Experience: {resume.experience} years\n"
                f"🛠 Skills: {desc_formatted}\n\n"
                f"📍 Location: <b>{region_name_esc}</b>\n"
            )
            if contact_block: text += f"\n📞 Contact:\n{contact_block}"
        elif lang == UserLanguage.RU:
            text = (
                f"🔔 <b>Новое резюме!</b>\n\n"
                f"👤 Специалист: <b>{prof_name_esc}</b>\n"
                f"🎯 Направление: <b>{cat_name_esc}</b>\n"
                f"🧠 Опыт: {resume.experience} лет\n"
                f"🛠 Навыки: {desc_formatted}\n\n"
                f"📍 Местоположение: <b>{region_name_esc}</b>\n"
            )
            if contact_block: text += f"\n📞 Контакты:\n{contact_block}"
        else: # UZ
            text = (
                f"🔔 <b>Sizga mos Resume yuklandi!</b>\n\n"
                f"👤 Mutaxassis: <b>{prof_name_esc}</b>\n"
                f"🎯 Yo‘nalish: <b>{cat_name_esc}</b>\n"
                f"🧠 Tajriba: {resume.experience} yil\n"
                f"🛠 Ko‘nikmalar: {desc_formatted}\n\n"
                f"📍 Joylashuv: <b>{region_name_esc}</b>\n"
            )
            if contact_block: text += f"\n📞 Bog‘lanish uchun:\n{contact_block}"
            
        print(text)

if __name__ == "__main__":
    asyncio.run(test_formatting())

