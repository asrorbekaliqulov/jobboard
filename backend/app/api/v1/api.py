from fastapi import APIRouter
from app.api.v1.endpoints import (
    regions, professions, admin_endpoints, auth, vacancy,
    favourite, resume, analytics, works, daily_job_seekers,
    ai, headhunter,
)

api_router = APIRouter()

api_router.include_router(favourite.router, prefix="/favourite", tags=["Favourite"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(regions.router, prefix="/regions", tags=["Public Regions"])
api_router.include_router(professions.router, prefix="/professions", tags=["Public Professions"])
api_router.include_router(vacancy.router, prefix="/vacancies", tags=["Vacancies"])
api_router.include_router(resume.router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(works.router, prefix="/works", tags=["Works"])
api_router.include_router(daily_job_seekers.router, prefix="/daily-job-seekers", tags=["Daily Job Seekers"])
api_router.include_router(admin_endpoints.router, prefix="/admin", tags=["Admin CRUD"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# AI Features
api_router.include_router(ai.router, prefix="/ai", tags=["AI Features"])
api_router.include_router(headhunter.router, prefix="/hh", tags=["HeadHunter Integration"])
