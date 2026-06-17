"""
AI-specific database models.
These are SEPARATE from existing models to avoid breaking the 8000-user production database.
New tables only - no modifications to existing tables.
"""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.base import TimestampMixin


# ==================== Employer Trust Rating ====================

class TrustLevel(str, enum.Enum):
    """Trust level for employers based on aggregated reviews."""
    EXCELLENT = "excellent"  # 4.5-5.0
    GOOD = "good"           # 3.5-4.4
    AVERAGE = "average"     # 2.5-3.4
    POOR = "poor"           # 1.5-2.4
    DANGEROUS = "dangerous" # 0-1.4


class EmployerTrustRating(Base, TimestampMixin):
    """
    Separate table for employer trust ratings.
    Does NOT modify the existing users table.
    Links to users via employer_user_id (FK to users.id).
    """
    __tablename__ = "ai_employer_trust_ratings"

    id: Mapped[int] = mapped_column(primary_key=True)
    employer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    company_name: Mapped[str] = mapped_column(String(255))
    
    # Aggregated scores (1.0 - 5.0 scale)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    salary_punctuality_score: Mapped[float] = mapped_column(Float, default=0.0)  # Maosh vaqtida berilishi
    working_conditions_score: Mapped[float] = mapped_column(Float, default=0.0)  # Ish sharoiti
    communication_score: Mapped[float] = mapped_column(Float, default=0.0)  # Muloqot
    
    trust_level: Mapped[TrustLevel] = mapped_column(
        Enum(TrustLevel), default=TrustLevel.AVERAGE
    )
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    total_vacancies_posted: Mapped[int] = mapped_column(Integer, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Flags
    has_salary_complaints: Mapped[bool] = mapped_column(Boolean, default=False)
    has_condition_complaints: Mapped[bool] = mapped_column(Boolean, default=False)


class EmployerReview(Base, TimestampMixin):
    """
    Individual reviews from workers about employers.
    """
    __tablename__ = "ai_employer_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    employer_trust_id: Mapped[int] = mapped_column(
        ForeignKey("ai_employer_trust_ratings.id", ondelete="CASCADE"), index=True
    )
    reviewer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    
    # Individual ratings (1-5)
    salary_punctuality: Mapped[int] = mapped_column(Integer)  # 1-5
    working_conditions: Mapped[int] = mapped_column(Integer)  # 1-5
    communication: Mapped[int] = mapped_column(Integer)       # 1-5
    overall: Mapped[int] = mapped_column(Integer)             # 1-5
    
    comment: Mapped[str | None] = mapped_column(Text)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True)


# ==================== AI Match Results ====================

class AIMatchResult(Base, TimestampMixin):
    """
    Stores AI-calculated match results between resumes and vacancies.
    Cached results to avoid re-computation.
    """
    __tablename__ = "ai_match_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    resume_id: Mapped[int] = mapped_column(
        ForeignKey("resumes.id", ondelete="CASCADE"), index=True
    )
    vacancy_id: Mapped[int] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    
    # Match scores (0-100)
    overall_match: Mapped[int] = mapped_column(Integer)  # Overall match percentage
    profession_match: Mapped[int] = mapped_column(Integer)  # Kasb mosligi
    experience_match: Mapped[int] = mapped_column(Integer)  # Tajriba mosligi
    location_match: Mapped[int] = mapped_column(Integer)    # Hudud mosligi
    salary_match: Mapped[int] = mapped_column(Integer)      # Maosh mosligi
    
    explanation: Mapped[str | None] = mapped_column(Text)   # AI explanation in Uzbek
    
    # Metadata
    ai_model_used: Mapped[str] = mapped_column(String(50), default="gpt-4o-mini")


# ==================== AI Interview Sessions ====================

class InterviewStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class AIInterviewSession(Base, TimestampMixin):
    """
    Stores AI interview simulation sessions for job seekers.
    Premium feature.
    """
    __tablename__ = "ai_interview_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    profession_id: Mapped[int | None] = mapped_column(
        ForeignKey("professions.id", ondelete="SET NULL"), nullable=True
    )
    
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus), default=InterviewStatus.IN_PROGRESS
    )
    
    # Interview conversation stored as JSON array
    # [{"role": "interviewer", "content": "..."}, {"role": "candidate", "content": "..."}]
    conversation: Mapped[dict | None] = mapped_column(JSON, default=list)
    
    # Results
    overall_score: Mapped[int | None] = mapped_column(Integer)  # 0-100
    strengths: Mapped[str | None] = mapped_column(Text)  # JSON array of strengths
    weaknesses: Mapped[str | None] = mapped_column(Text)  # JSON array of weaknesses
    recommendations: Mapped[str | None] = mapped_column(Text)  # AI recommendations
    
    questions_asked: Mapped[int] = mapped_column(Integer, default=0)
    questions_answered: Mapped[int] = mapped_column(Integer, default=0)


# ==================== AI Fraud Reports ====================

class FraudSeverity(str, enum.Enum):
    LOW = "low"         # Minor concerns
    MEDIUM = "medium"   # Suspicious patterns
    HIGH = "high"       # Likely fraud
    CRITICAL = "critical"  # Definite fraud markers


class AIFraudReport(Base, TimestampMixin):
    """
    Stores AI-generated fraud analysis reports for job postings.
    """
    __tablename__ = "ai_fraud_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    vacancy_id: Mapped[int | None] = mapped_column(
        ForeignKey("vacancies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reported_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    
    severity: Mapped[FraudSeverity] = mapped_column(Enum(FraudSeverity))
    risk_score: Mapped[int] = mapped_column(Integer)  # 0-100
    
    # Detected issues as JSON
    # [{"type": "unrealistic_salary", "description": "...", "severity": "high"}]
    issues_detected: Mapped[dict | None] = mapped_column(JSON, default=list)
    
    ai_explanation: Mapped[str | None] = mapped_column(Text)
    is_confirmed_fraud: Mapped[bool] = mapped_column(Boolean, default=False)
    is_false_positive: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # The analyzed text
    analyzed_text: Mapped[str | None] = mapped_column(Text)
    phone_number: Mapped[str | None] = mapped_column(String(20))


# ==================== AI Salary Analytics Cache ====================

class AISalaryCache(Base, TimestampMixin):
    """
    Caches salary analytics per profession/region for efficiency.
    Updated periodically by scheduler.
    """
    __tablename__ = "ai_salary_cache"

    id: Mapped[int] = mapped_column(primary_key=True)
    profession_id: Mapped[int] = mapped_column(
        ForeignKey("professions.id", ondelete="CASCADE"), index=True
    )
    region_id: Mapped[int | None] = mapped_column(
        ForeignKey("regions.id", ondelete="SET NULL"), nullable=True
    )
    
    # Statistics from real database data
    min_salary: Mapped[int] = mapped_column(Integer, default=0)
    max_salary: Mapped[int] = mapped_column(Integer, default=0)
    avg_salary: Mapped[int] = mapped_column(Integer, default=0)
    median_salary: Mapped[int] = mapped_column(Integer, default=0)
    sample_count: Mapped[int] = mapped_column(Integer, default=0)  # Number of vacancies analyzed
    
    # AI-generated market insights
    market_trend: Mapped[str | None] = mapped_column(String(50))  # "growing", "stable", "declining"
    ai_recommendation: Mapped[str | None] = mapped_column(Text)
    
    last_calculated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
