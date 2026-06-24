from app.core.database import Base
from app.models.user import User, UserLanguage, UserRole
from app.models.location import Region, District
from app.models.profession import Profession
from app.models.vacancy import Vacancy, VacancyStatus, WorkFormat, WorkType, WorkSchedule
from app.models.resume import Resume, ResumeStatus, Gender
from app.models.daily_job_seeker import DailyJobSeeker, Work, daily_job_seeker_works
from app.models.favourite import FavouriteVacancy, FavouriteResume, FavouriteDailyJobSeeker
from app.models.channel_message import ChannelMessage, ChannelMessageEntity
from app.models.like import Like
from app.models.bot_user_profile import BotUserProfile
from app.models.userbot import UserbotAccount, UserbotChannel, UserbotStatus
from app.models.ai_models import (
    EmployerTrustRating,
    EmployerReview,
    TrustLevel,
    AIMatchResult,
    AIInterviewSession,
    InterviewStatus,
    AIFraudReport,
    FraudSeverity,
    AISalaryCache,
)

__all__ = [
    "Base",
    "User",
    "UserLanguage",
    "UserRole",
    "Region",
    "District",
    "Profession",
    "Vacancy",
    "VacancyStatus",
    "WorkFormat",
    "WorkType",
    "WorkSchedule",
    "Resume",
    "ResumeStatus",
    "Gender",
    "DailyJobSeeker",
    "Work",
    "daily_job_seeker_works",
    "FavouriteVacancy",
    "FavouriteResume",
    "FavouriteDailyJobSeeker",
    "ChannelMessage",
    "ChannelMessageEntity",
    "Like",
    "BotUserProfile",
    "UserbotAccount",
    "UserbotChannel",
    "UserbotStatus",
    # AI Models
    "EmployerTrustRating",
    "EmployerReview",
    "TrustLevel",
    "AIMatchResult",
    "AIInterviewSession",
    "InterviewStatus",
    "AIFraudReport",
    "FraudSeverity",
    "AISalaryCache",
]
