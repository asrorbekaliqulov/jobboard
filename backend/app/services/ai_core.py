"""
Core AI service - OpenAI client wrapper with retry logic and Uzbek context.
All AI features use this as their foundation.
"""
import json
import logging
from typing import Optional

from openai import AsyncOpenAI, APIError, RateLimitError, APIConnectionError
from app.core.config import settings

logger = logging.getLogger(__name__)

# Global OpenAI client (lazy init)
_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create the OpenAI async client."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# System prompts for different AI features
SYSTEM_PROMPTS = {
    "worker_finder": (
        "Sen O'zbekiston mehnat bozori bo'yicha AI yordamchisan. "
        "Sening vazifang - ish beruvchining e'lon matnini tahlil qilib, "
        "bazadan eng mos ishchilarni topishda yordam berish. "
        "Faqat berilgan ma'lumotlar asosida javob ber, o'ylab topma. "
        "Javobni JSON formatda ber."
    ),
    "job_post_writer": (
        "Sen O'zbekiston mehnat bozori uchun professional e'lon yozuvchi AI san. "
        "Oddiy va qisqa matnlarni to'liq, chiroyli va tartibli vakansiya e'loniga aylantirasan. "
        "E'londa albatta: Lavozim, Maosh, Talablar, Ish vaqti, Grafik, Manzil bo'lishi kerak. "
        "O'zbek tilida yoz. Javobni JSON formatda ber."
    ),
    "resume_builder": (
        "Sen professional rezyume (CV) tuzuvchi AI san. "
        "Ishchining oddiy gaplarini tahlil qilib, professional rezyume shakliga keltirasan. "
        "O'zbekiston bozori uchun mos formatda yoz. "
        "Javobni JSON formatda ber."
    ),
    "career_advisor": (
        "Sen O'zbekiston yoshlari uchun kasb maslahatchi AI san. "
        "Foydalanuvchining yoshi, qiziqishlari va ta'lim darajasiga qarab, "
        "O'zbekiston bozoridagi real kasblarni tavsiya qilasan. "
        "Maosh ma'lumotlarini faqat berilgan bazadagi real raqamlar asosida ayt. "
        "Javobni JSON formatda ber."
    ),
    "voice_operator": (
        "Sen ovozli xabarlarni professional e'lon yoki rezyumega aylantiruvchi AI san. "
        "Berilgan matnni tahlil qilib, unda vakansiya yoki rezyume ma'lumotlarini ajrat. "
        "Sheva so'zlarini standart o'zbek tiliga o'gir. "
        "Javobni JSON formatda ber."
    ),
    "fraud_filter": (
        "Sen firibgar e'lonlarni aniqlovchi AI xavfsizlik tizimisan. "
        "E'lonlarni quyidagi mezonlar bo'yicha tekshir: "
        "1) Asossiz katta maosh (kasb uchun bozor narxidan 3+ baravar yuqori) "
        "2) Oldindan pul talab qilish "
        "3) Noaniq kompaniya nomi "
        "4) Shaxsiy hujjatlar talab qilish "
        "5) Faqat messengerdagi aloqa (telefon raqam yo'q) "
        "6) Ko'p vaʼdalar, kam tafsilot. "
        "Faqat real dalillar asosida baho ber. Javobni JSON formatda ber."
    ),
    "match_system": (
        "Sen ishchi va vakansiya mosligini aniqlovchi AI san. "
        "Berilgan resume va vakansiya ma'lumotlarini solishtirib, moslik foizini hisoblaysan. "
        "Mezonlar: kasb mosligi, tajriba, hudud, maosh kutilishi. "
        "Har bir mezon bo'yicha alohida baho ber (0-100). "
        "Faqat berilgan ma'lumotlar asosida hisoblash qil. Javobni JSON formatda ber."
    ),
    "translator": (
        "Sen ko'p tilli tarjimon AI san, O'zbekiston shevalarini ham tushunasan. "
        "Viloyat shevalarini standart adabiy o'zbek tiliga o'gir. "
        "Rus tilidan o'zbek tiliga oson tushunarli tarjima qil. "
        "Javobni JSON formatda ber."
    ),
    "gig_economy": (
        "Sen kunlik/tezkor ishlar bo'yicha AI yordamchisan. "
        "Ish beruvchining talab qilayotgan ishini tahlil qilib, "
        "bazadagi kunlik ishchilardan eng moslarini topishda yordam ber. "
        "Geolokatsiya (tuman), ish turi va tajribani hisobga ol. "
        "Javobni JSON formatda ber."
    ),
    "interview_simulator": (
        "Sen tajribali HR menejer va intervyu o'tkazuvchisan. "
        "O'zbekiston kompaniyalarida qo'llaniladigan savollarni ber. "
        "Nomzodning javoblarini professional baholab, konstruktiv fikr bildir. "
        "Har bir javobga qisqacha baho ber, keyin keyingi savolni ber. "
        "O'zbek tilida muloqot qil."
    ),
    "salary_analytics": (
        "Sen O'zbekiston mehnat bozori maosh analitigi AI san. "
        "Faqat berilgan bazadagi real ma'lumotlar asosida tahlil qil. "
        "O'ylab topilgan raqamlarni HECH QACHON aytma. "
        "Agar ma'lumot yetarli bo'lmasa, shuni ochiq ayt. "
        "Javobni JSON formatda ber."
    ),
    "company_trust": (
        "Sen kompaniyalar ishonchliligi bo'yicha tahlilchi AI san. "
        "Foydalanuvchilar tomonidan qoldirilgan baholar asosida "
        "kompaniya ishonchliligini aniqlaysan. "
        "Faqat real baholar asosida xulosa ber. "
        "Javobni JSON formatda ber."
    ),
}


async def ai_chat_completion(
    feature: str,
    user_message: str,
    context_data: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: Optional[int] = None,
    response_format: Optional[str] = "json",
) -> str:
    """
    Core function to call OpenAI ChatGPT API with retry logic.
    
    Args:
        feature: Key from SYSTEM_PROMPTS dict
        user_message: User's question or data to analyze
        context_data: Additional database context to include
        temperature: Creativity level (lower = more factual)
        max_tokens: Override default max tokens
        response_format: "json" for JSON response, None for free text
    
    Returns:
        AI response text
    
    Raises:
        ValueError: If AI is not configured
        RuntimeError: If all retries fail
    """
    if not settings.ai_enabled:
        raise ValueError("AI xizmati sozlanmagan. OPENAI_API_KEY ni .env faylga qo'shing.")
    
    client = get_openai_client()
    system_prompt = SYSTEM_PROMPTS.get(feature, SYSTEM_PROMPTS["worker_finder"])
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add context data if provided (database info)
    if context_data:
        messages.append({
            "role": "system",
            "content": f"Bazadagi ma'lumotlar:\n{context_data}"
        })
    
    messages.append({"role": "user", "content": user_message})
    
    # Retry logic (3 attempts)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            kwargs = {
                "model": settings.OPENAI_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens or settings.OPENAI_MAX_TOKENS,
            }
            
            # Request JSON format when needed
            if response_format == "json":
                kwargs["response_format"] = {"type": "json_object"}
            
            response = await client.chat.completions.create(**kwargs)
            
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("AI bo'sh javob qaytardi")
            
            return content.strip()
            
        except RateLimitError:
            if attempt < max_retries - 1:
                import asyncio
                wait_time = (attempt + 1) * 2
                logger.warning(f"OpenAI rate limit, {wait_time}s kutilmoqda...")
                await asyncio.sleep(wait_time)
            else:
                raise RuntimeError("AI xizmati hozir band. Iltimos, keyinroq urinib ko'ring.")
        
        except APIConnectionError:
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep(1)
            else:
                raise RuntimeError("AI xizmatiga ulanib bo'lmadi. Internet aloqasini tekshiring.")
        
        except APIError as e:
            logger.error(f"OpenAI API error: {e}")
            raise RuntimeError(f"AI xizmatida xatolik: {str(e)}")
        
        except Exception as e:
            logger.error(f"Unexpected AI error: {e}")
            raise RuntimeError(f"Kutilmagan xatolik: {str(e)}")
    
    raise RuntimeError("AI xizmati javob bermadi")


async def ai_chat_conversation(
    feature: str,
    messages: list[dict],
    temperature: float = 0.5,
    max_tokens: Optional[int] = None,
) -> str:
    """
    For multi-turn conversations (like interview simulator).
    Messages should be in OpenAI format: [{"role": "...", "content": "..."}]
    """
    if not settings.ai_enabled:
        raise ValueError("AI xizmati sozlanmagan.")
    
    client = get_openai_client()
    system_prompt = SYSTEM_PROMPTS.get(feature, "")
    
    full_messages = [{"role": "system", "content": system_prompt}] + messages
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=full_messages,
                temperature=temperature,
                max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
            )
            
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("AI bo'sh javob qaytardi")
            return content.strip()
            
        except RateLimitError:
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep((attempt + 1) * 2)
            else:
                raise RuntimeError("AI xizmati hozir band.")
        except Exception as e:
            if attempt < max_retries - 1:
                import asyncio
                await asyncio.sleep(1)
            else:
                logger.error(f"AI conversation error: {e}")
                raise RuntimeError(f"AI xatolik: {str(e)}")
    
    raise RuntimeError("AI xizmati javob bermadi")


def parse_ai_json(response: str) -> dict:
    """Safely parse AI JSON response, handling edge cases."""
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code blocks
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end > start:
                return json.loads(response[start:end].strip())
        elif "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end > start:
                return json.loads(response[start:end].strip())
        
        # Try to find JSON object in text
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
        
        raise ValueError(f"AI javobini JSON formatga o'girib bo'lmadi: {response[:200]}")
