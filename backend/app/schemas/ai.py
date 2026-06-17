"""
Pydantic schemas for all AI features.
Separate from existing schemas - no modifications to existing code.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ==================== Common ====================

class AIErrorResponse(BaseModel):
    error: str
    detail: str | None = None


# ==================== 1. AI Worker Finder ====================

class AIWorkerFinderRequest(BaseModel):
    """Ish beruvchi matnli e'lonini tahlil qilish uchun."""
    description: str = Field(..., min_length=10, max_length=2000, description="E'lon matni yoki talab")
    region_id: Optional[int] = None
    max_results: int = Field(default=10, ge=1, le=50)


class MatchedWorker(BaseModel):
    resume_id: int
    full_name: str
    profession: str
    experience: int
    region: str
    match_score: int = Field(..., ge=0, le=100, description="Moslik darajasi foizda")
    match_reason: str  # Nima uchun mos ekanligi


class AIWorkerFinderResponse(BaseModel):
    workers: List[MatchedWorker]
    total_found: int
    search_summary: str  # AI tomonidan tahlil qilingan talab qisqacha


# ==================== 2. AI Job Post Writer ====================

class AIJobPostWriterRequest(BaseModel):
    """Oddiy matndan professional e'lon yaratish."""
    simple_text: str = Field(..., min_length=5, max_length=500, description="Oddiy matn, masalan: 'Kafega ofitsiant kerak'")
    company_name: Optional[str] = None
    region_id: Optional[int] = None
    language: str = Field(default="uz", description="uz, ru, en")


class AIJobPostWriterResponse(BaseModel):
    title: str
    description: str  # To'liq tartibli e'lon matni
    suggested_salary_from: Optional[int] = None
    suggested_salary_till: Optional[int] = None
    suggested_requirements: List[str]
    suggested_work_hours: Optional[int] = None
    suggested_schedule: Optional[str] = None
    suggested_profession_id: Optional[int] = None


# ==================== 3. AI Resume Builder ====================

class AIResumeBuilderRequest(BaseModel):
    """Oddiy gaplardan professional rezyume yaratish."""
    simple_text: str = Field(..., min_length=10, max_length=1000, description="Masalan: 'Men elektrikman, 5 yil staj bor'")
    language: str = Field(default="uz")


class AIResumeBuilderResponse(BaseModel):
    professional_summary: str
    skills: List[str]
    experience_description: str
    suggested_profession_id: Optional[int] = None
    suggested_profession_name: Optional[str] = None
    formatted_resume_text: str  # Ready-to-use resume text


# ==================== 4. AI Career Advisor ====================

class AICareerAdvisorRequest(BaseModel):
    """Yoshlar uchun kasb maslahat."""
    age: int = Field(..., ge=14, le=65)
    interests: List[str] = Field(..., min_length=1, description="Qiziqishlar ro'yxati")
    education_level: Optional[str] = None  # "school", "college", "university", "none"
    current_skills: Optional[List[str]] = None
    region_id: Optional[int] = None
    language: str = Field(default="uz")


class CareerSuggestion(BaseModel):
    profession_name: str
    profession_id: Optional[int] = None
    match_reason: str
    estimated_salary_from: Optional[int] = None
    estimated_salary_till: Optional[int] = None
    growth_potential: str  # "high", "medium", "low"
    how_to_start: str  # Qayerdan boshlash kerak
    required_skills: List[str]


class AICareerAdvisorResponse(BaseModel):
    suggestions: List[CareerSuggestion]
    general_advice: str
    market_overview: str  # O'zbekiston bozori haqida qisqacha


# ==================== 5. AI Voice Operator ====================

class AIVoiceOperatorRequest(BaseModel):
    """Ovozli xabar matnidan e'lon yaratish."""
    transcribed_text: str = Field(..., min_length=5, max_length=2000, description="Ovozdan matnga aylantirilgan text")
    intent: str = Field(default="auto", description="'vacancy', 'resume', 'auto' - nima yaratish kerak")
    language: str = Field(default="uz")


class AIVoiceOperatorResponse(BaseModel):
    detected_intent: str  # "vacancy" or "resume"
    generated_content: dict  # VacancyCreate or ResumeCreate format
    confidence: float = Field(ge=0.0, le=1.0)
    cleaned_text: str  # Tozalangan matn


# ==================== 6. AI Fraud Filter ====================

class AIFraudFilterRequest(BaseModel):
    """E'lonni firibgarlik uchun tekshirish."""
    description: str
    salary_from: Optional[int] = None
    salary_till: Optional[int] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    contact_telegram: Optional[str] = None


class FraudIssue(BaseModel):
    issue_type: str  # "unrealistic_salary", "prepayment_required", "blacklisted_phone", etc.
    description: str
    severity: str  # "low", "medium", "high", "critical"


class AIFraudFilterResponse(BaseModel):
    is_suspicious: bool
    risk_score: int = Field(ge=0, le=100)
    severity: str  # "low", "medium", "high", "critical"
    issues: List[FraudIssue]
    recommendation: str  # Foydalanuvchiga maslahat
    safe_to_apply: bool


# ==================== 7. AI Match System ====================

class AIMatchRequest(BaseModel):
    """Resume va vakansiya mosligini hisoblash."""
    resume_id: int
    vacancy_id: int


class AIMatchResponse(BaseModel):
    overall_match: int = Field(ge=0, le=100)
    profession_match: int = Field(ge=0, le=100)
    experience_match: int = Field(ge=0, le=100)
    location_match: int = Field(ge=0, le=100)
    salary_match: int = Field(ge=0, le=100)
    explanation: str  # O'zbek tilida tushuntirish
    recommendations: List[str]  # Nomzodga tavsiyalar


class AIBulkMatchRequest(BaseModel):
    """Bitta resume uchun barcha aktiv vakansiyalar bilan solishtirish."""
    resume_id: int
    limit: int = Field(default=20, ge=1, le=50)


class AIBulkMatchResponse(BaseModel):
    matches: List[AIMatchResponse]
    resume_summary: str


# ==================== 8. AI Regional Translator ====================

class AITranslatorRequest(BaseModel):
    """Matn tarjimasi va dialekt tozalash."""
    text: str = Field(..., min_length=1, max_length=2000)
    source_language: str = Field(default="auto", description="'uz', 'ru', 'en', 'auto'")
    target_language: str = Field(default="uz", description="'uz', 'ru', 'en'")
    clean_dialect: bool = Field(default=True, description="Sheva so'zlarini standartga o'girish")


class AITranslatorResponse(BaseModel):
    translated_text: str
    detected_language: str
    dialect_corrections: List[dict] | None = None  # [{"original": "...", "corrected": "..."}]
    confidence: float = Field(ge=0.0, le=1.0)


# ==================== 9. AI Gig Economy (Tezkor ishlar) ====================

class AIGigMatchRequest(BaseModel):
    """Tezkor/kunlik ishlar uchun eng yaqin ishchilarga xabar yuborish."""
    work_description: str
    region_id: int
    district_ids: Optional[List[int]] = None
    needed_workers: int = Field(default=1, ge=1, le=20)
    urgency: str = Field(default="normal", description="'urgent', 'normal', 'flexible'")
    budget: Optional[int] = None


class GigWorkerMatch(BaseModel):
    daily_job_seeker_id: int
    full_name: str
    works: List[str]  # Ish turlari
    region: str
    districts: List[str]
    match_score: int = Field(ge=0, le=100)
    available: bool = True


class AIGigMatchResponse(BaseModel):
    matched_workers: List[GigWorkerMatch]
    total_available: int
    ai_summary: str


# ==================== 10. AI Interview Simulator ====================

class AIInterviewStartRequest(BaseModel):
    """Intervyu simulyatsiyasini boshlash."""
    profession_id: Optional[int] = None
    profession_name: Optional[str] = None
    difficulty: str = Field(default="medium", description="'easy', 'medium', 'hard'")
    language: str = Field(default="uz")


class AIInterviewStartResponse(BaseModel):
    session_id: int
    first_question: str
    interviewer_intro: str
    total_questions: int


class AIInterviewAnswerRequest(BaseModel):
    """Intervyuda javob berish."""
    session_id: int
    answer: str = Field(..., min_length=1, max_length=2000)


class AIInterviewAnswerResponse(BaseModel):
    feedback: str  # AI ning javobga fikri
    next_question: Optional[str] = None  # Keyingi savol (None = tugadi)
    is_completed: bool = False
    current_score: Optional[int] = None  # 0-100


class AIInterviewResultResponse(BaseModel):
    session_id: int
    overall_score: int = Field(ge=0, le=100)
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    detailed_feedback: str


# ==================== 11. AI Salary Analytics ====================

class AISalaryAnalyticsRequest(BaseModel):
    """Maosh tahlili so'rovi."""
    profession_id: Optional[int] = None
    profession_name: Optional[str] = None
    region_id: Optional[int] = None
    experience_years: Optional[int] = None
    role: str = Field(default="both", description="'employer', 'worker', 'both'")


class SalaryRange(BaseModel):
    min_salary: int
    max_salary: int
    avg_salary: int
    median_salary: int
    sample_count: int


class AISalaryAnalyticsResponse(BaseModel):
    profession_name: str
    region_name: Optional[str] = None
    salary_data: SalaryRange
    market_trend: str  # "growing", "stable", "declining"
    ai_recommendation: str  # Maslahat (ish beruvchi yoki ishchi uchun)
    is_salary_competitive: Optional[bool] = None
    comparison_text: str  # "Sizning maoshingiz bozor o'rtachasidan 15% yuqori"
    data_freshness: str  # "Bazadagi 45 ta aktiv vakansiya asosida"


# ==================== 12. AI Company Trust ====================

class AICompanyTrustRequest(BaseModel):
    """Kompaniya ishonchlilik so'rovi."""
    employer_user_id: Optional[int] = None
    company_name: Optional[str] = None


class AICompanyTrustResponse(BaseModel):
    company_name: str
    overall_score: float = Field(ge=0.0, le=5.0)
    trust_level: str  # "excellent", "good", "average", "poor", "dangerous"
    total_reviews: int
    total_vacancies: int
    salary_punctuality: float
    working_conditions: float
    communication: float
    is_verified: bool
    has_complaints: bool
    ai_summary: str  # AI tomonidan yozilgan qisqa xulosa


class AICompanyReviewRequest(BaseModel):
    """Kompaniyaga baho berish."""
    employer_user_id: int
    company_name: str
    salary_punctuality: int = Field(..., ge=1, le=5)
    working_conditions: int = Field(..., ge=1, le=5)
    communication: int = Field(..., ge=1, le=5)
    overall: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)
    is_anonymous: bool = True


class AICompanyReviewResponse(BaseModel):
    review_id: int
    message: str
    updated_score: float


# ==================== HeadHunter Integration ====================

class HHVacancyItem(BaseModel):
    """HeadHunter dan olingan vakansiya."""
    hh_id: str
    title: str
    company_name: str
    salary_from: Optional[int] = None
    salary_till: Optional[int] = None
    salary_currency: str = "UZS"
    region: Optional[str] = None
    experience: Optional[str] = None
    employment_type: Optional[str] = None
    description_short: Optional[str] = None
    url: str  # HH.uz ga havola
    published_at: Optional[str] = None
    is_from_hh: bool = True  # HeadHunter dan ekanligini belgilash


class HHVacancyListResponse(BaseModel):
    items: List[HHVacancyItem]
    total: int
    page: int
    per_page: int
    source: str = "headhunter.uz"
