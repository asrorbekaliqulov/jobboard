"""
AI Feature API Endpoints
All 12 AI features in a single router.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.ai import (
    # 1. Worker Finder
    AIWorkerFinderRequest,
    AIWorkerFinderResponse,
    # 2. Job Post Writer
    AIJobPostWriterRequest,
    AIJobPostWriterResponse,
    # 3. Resume Builder
    AIResumeBuilderRequest,
    AIResumeBuilderResponse,
    # 4. Career Advisor
    AICareerAdvisorRequest,
    AICareerAdvisorResponse,
    # 5. Voice Operator
    AIVoiceOperatorRequest,
    AIVoiceOperatorResponse,
    # 6. Fraud Filter
    AIFraudFilterRequest,
    AIFraudFilterResponse,
    # 7. Match System
    AIMatchRequest,
    AIMatchResponse,
    AIBulkMatchRequest,
    AIBulkMatchResponse,
    # 8. Translator
    AITranslatorRequest,
    AITranslatorResponse,
    # 9. Gig Economy
    AIGigMatchRequest,
    AIGigMatchResponse,
    # 10. Interview
    AIInterviewStartRequest,
    AIInterviewStartResponse,
    AIInterviewAnswerRequest,
    AIInterviewAnswerResponse,
    AIInterviewResultResponse,
    # 11. Salary Analytics
    AISalaryAnalyticsRequest,
    AISalaryAnalyticsResponse,
    # 12. Company Trust
    AICompanyTrustRequest,
    AICompanyTrustResponse,
    AICompanyReviewRequest,
    AICompanyReviewResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _check_ai_enabled():
    """Verify AI is configured before processing requests."""
    if not settings.ai_enabled:
        raise HTTPException(
            status_code=503,
            detail="AI xizmati hozirda sozlanmagan. Administrator bilan bog'laning.",
        )


# ==================== 1. AI Worker Finder ====================

@router.post("/worker-finder", response_model=AIWorkerFinderResponse)
async def ai_find_workers(
    request: AIWorkerFinderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Ishchi Topuvchi - E'lon matnini tahlil qilib eng mos ishchilarni topadi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_worker_finder import AIWorkerFinderService
        return await AIWorkerFinderService.find_workers(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Worker Finder error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 2. AI Job Post Writer ====================

@router.post("/job-post-writer", response_model=AIJobPostWriterResponse)
async def ai_write_job_post(
    request: AIJobPostWriterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI E'lon Yozuvchi - Oddiy matndan professional vakansiya e'loni yaratadi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_job_post_writer import AIJobPostWriterService
        return await AIJobPostWriterService.generate_post(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Job Post Writer error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 3. AI Resume Builder ====================

@router.post("/resume-builder", response_model=AIResumeBuilderResponse)
async def ai_build_resume(
    request: AIResumeBuilderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Rezyume Tuzuvchi - Oddiy gaplardan professional rezyume yaratadi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_resume_builder import AIResumeBuilderService
        return await AIResumeBuilderService.build_resume(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Resume Builder error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 4. AI Career Advisor ====================

@router.post("/career-advisor", response_model=AICareerAdvisorResponse)
async def ai_career_advice(
    request: AICareerAdvisorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Kasb Maslahatchisi - Yoshlarga kasb tanlashda maslahat beradi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_career_advisor import AICareerAdvisorService
        return await AICareerAdvisorService.get_advice(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Career Advisor error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 5. AI Voice Operator ====================

@router.post("/voice-operator", response_model=AIVoiceOperatorResponse)
async def ai_voice_process(
    request: AIVoiceOperatorRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Ovozli Operator - Ovozli xabar matnidan e'lon/rezyume yaratadi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_voice_operator import AIVoiceOperatorService
        return await AIVoiceOperatorService.process_voice_text(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Voice Operator error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 6. AI Fraud Filter ====================

@router.post("/fraud-filter", response_model=AIFraudFilterResponse)
async def ai_check_fraud(
    request: AIFraudFilterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Firibgarlik Filtri - E'lonlarni firibgarlik uchun tekshiradi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_fraud_filter import AIFraudFilterService
        return await AIFraudFilterService.check_posting(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Fraud Filter error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 7. AI Match System ====================

@router.post("/match", response_model=AIMatchResponse)
async def ai_match(
    request: AIMatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Match System - Resume va vakansiya mosligini foizlarda hisoblaydi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_match import AIMatchService
        return await AIMatchService.calculate_match(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Match error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


@router.post("/match/bulk", response_model=AIBulkMatchResponse)
async def ai_bulk_match(
    request: AIBulkMatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Bulk Match - Rezyumeni barcha aktiv vakansiyalar bilan solishtiradi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_match import AIMatchService
        return await AIMatchService.bulk_match(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Bulk Match error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 8. AI Translator ====================

@router.post("/translate", response_model=AITranslatorResponse)
async def ai_translate(
    request: AITranslatorRequest,
    current_user: User = Depends(get_current_user),
):
    """
    AI Tarjimon - Matn tarjimasi va sheva tozalash.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_translator import AITranslatorService
        return await AITranslatorService.translate(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Translator error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 9. AI Gig Economy ====================

@router.post("/gig-match", response_model=AIGigMatchResponse)
async def ai_gig_match(
    request: AIGigMatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Tezkor Ishlar - Kunlik ishlar uchun eng yaqin ishchilarga xabar yuboradi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_gig_economy import AIGigEconomyService
        return await AIGigEconomyService.find_gig_workers(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Gig Match error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 10. AI Interview Simulator ====================

@router.post("/interview/start", response_model=AIInterviewStartResponse)
async def ai_interview_start(
    request: AIInterviewStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Intervyu Simulyatori - Suhbatni boshlash.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_interview import AIInterviewService
        return await AIInterviewService.start_interview(db, request, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Interview Start error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


@router.post("/interview/answer", response_model=AIInterviewAnswerResponse)
async def ai_interview_answer(
    request: AIInterviewAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Intervyu - Savolga javob berish va keyingi savol olish.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_interview import AIInterviewService
        return await AIInterviewService.answer_question(db, request, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Interview Answer error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


@router.get("/interview/{session_id}/results", response_model=AIInterviewResultResponse)
async def ai_interview_results(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Intervyu Natijalari - Suhbat yakunlari va tavsiyalar.
    """
    try:
        from app.services.ai_interview import AIInterviewService
        return await AIInterviewService.get_results(db, session_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"AI Interview Results error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 11. AI Salary Analytics ====================

@router.post("/salary-analytics", response_model=AISalaryAnalyticsResponse)
async def ai_salary_analytics(
    request: AISalaryAnalyticsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Maosh Analitigi - Bozordagi real maosh tahlili.
    FAQAT bazadagi ma'lumotlar asosida ishlaydi.
    """
    _check_ai_enabled()
    try:
        from app.services.ai_salary_analytics import AISalaryAnalyticsService
        return await AISalaryAnalyticsService.get_analytics(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Salary Analytics error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


# ==================== 12. AI Company Trust ====================

@router.post("/company-trust", response_model=AICompanyTrustResponse)
async def ai_company_trust(
    request: AICompanyTrustRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Kompaniya Ishonchliligi - Ish beruvchi reytingi va ishonch darajasi.
    """
    try:
        from app.services.ai_company_trust import AICompanyTrustService
        return await AICompanyTrustService.get_trust_info(db, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"AI Company Trust error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")


@router.post("/company-trust/review", response_model=AICompanyReviewResponse)
async def ai_company_review(
    request: AICompanyReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kompaniyaga baho qo'yish.
    """
    try:
        from app.services.ai_company_trust import AICompanyTrustService
        return await AICompanyTrustService.add_review(db, request, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"AI Company Review error: {e}")
        raise HTTPException(status_code=500, detail="AI xizmatida xatolik yuz berdi")



# ==================== AI Agent Search (Smart Search) ====================

from pydantic import BaseModel as PydanticBaseModel
from typing import Optional as Opt, List as Lst

class AgentSearchRequest(PydanticBaseModel):
    query: str
    role: str = "job_seeker"  # "job_seeker" or "candidate_hunter"
    region_id: Opt[int] = None
    limit: int = 10

class AgentSearchResponse(PydanticBaseModel):
    items: Lst[dict]
    summary: str
    total: int
    search_type: str


@router.post("/agent-search", response_model=AgentSearchResponse)
async def ai_agent_search(
    request: AgentSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Agent Search - aqlli qidiruv.
    1. So'rovni tahlil qiladi (intent, kasblar, hudud)
    2. Bazadan mos natijalarni topadi
    3. AI natijalarni moslik bo'yicha tartiblaydi
    """
    _check_ai_enabled()
    try:
        from app.services.ai_agent_search import AIAgentSearchService
        # Use role from request (frontend sends current active role)
        role = request.role
        result = await AIAgentSearchService.search(
            db=db,
            query=request.query,
            role=role,
            region_id=request.region_id,
            limit=request.limit,
        )
        return AgentSearchResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"AI Agent Search error: {e}")
        raise HTTPException(status_code=500, detail="AI qidiruvda xatolik yuz berdi")



# ==================== Voice Transcription (for WebApp) ====================

from fastapi import UploadFile, File

@router.post("/voice-transcribe")
async def ai_voice_transcribe(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Transcribe voice audio to text using OpenAI Whisper.
    Used by WebApp when Web Speech API is not available (Telegram WebApp).
    """
    _check_ai_enabled()
    try:
        from openai import AsyncOpenAI
        from io import BytesIO

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Read uploaded file
        content = await file.read()
        audio_file = BytesIO(content)
        audio_file.name = file.filename or "voice.webm"

        # Transcribe with gpt-4o-mini-transcribe (better Uzbek support)
        transcription = await client.audio.transcriptions.create(
            model=settings.OPENAI_TRANSCRIBE_MODEL,
            file=audio_file,
            prompt="Bu O'zbek tilidagi ish qidirish so'rovi. Iltimos o'zbek tilida transkripsiya qil.",
        )

        return {"text": transcription.text.strip()}

    except Exception as e:
        logger.error(f"Voice transcription error: {e}")
        raise HTTPException(status_code=500, detail="Ovozni matnga aylantirib bo'lmadi")
