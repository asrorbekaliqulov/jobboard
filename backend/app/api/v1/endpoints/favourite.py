from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.favourite import (
    FavouriteDailyJobSeekerCreate,
    FavouriteDailyJobSeekerList,
    FavouriteDailyJobSeekerRead,
    FavouriteResumeCreate,
    FavouriteResumeList,
    FavouriteResumeRead,
    FavouriteVacancyCreate,
    FavouriteVacancyList,
    FavouriteVacancyRead,
)
from app.services.favourite_daily_job_seeker import FavouriteDailyJobSeekerService
from app.services.favourite_resume import FavouriteResumeService
from app.services.favourite_vacancy import FavouriteVacancyService
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# --- Vacancies ---


@router.get("/vacancies", response_model=FavouriteVacancyList)
async def list_favourite_vacancies(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List favourite vacancies for the current user.
    """
    vacancies = await FavouriteVacancyService.get_all(
        db, skip=skip, limit=limit, user_id=current_user.id
    )
    total = await FavouriteVacancyService.count(db, user_id=current_user.id)
    return FavouriteVacancyList(vacancies=vacancies, total=total)


@router.post("/vacancies", response_model=FavouriteVacancyRead)
async def create_favourite_vacancy(
    favourite_in: FavouriteVacancyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a vacancy to favourites.
    """
    return await FavouriteVacancyService.create(
        db, favourite_in, user_id=current_user.id
    )


@router.delete("/vacancies/{vacancy_id}")
async def delete_favourite_vacancy(
    vacancy_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove a vacancy from favourites.
    """
    success = await FavouriteVacancyService.delete_by_vacancy_id(
        db, vacancy_id=vacancy_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"detail": "Bookmark removed"}


# --- Resumes ---


@router.get("/resumes", response_model=FavouriteResumeList)
async def list_favourite_resumes(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List favourite resumes for the current user (Candidate Hunter).
    """
    resumes = await FavouriteResumeService.get_all(
        db, skip=skip, limit=limit, user_id=current_user.id
    )
    total = await FavouriteResumeService.count(db, user_id=current_user.id)
    return FavouriteResumeList(resumes=resumes, total=total)


@router.post("/resumes", response_model=FavouriteResumeRead)
async def create_favourite_resume(
    favourite_in: FavouriteResumeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a resume to favourites.
    """
    return await FavouriteResumeService.create(
        db, favourite_in, user_id=current_user.id
    )


@router.delete("/resumes/{resume_id}")
async def delete_favourite_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove a resume from favourites.
    """
    success = await FavouriteResumeService.delete_by_resume_id(
        db, resume_id=resume_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"detail": "Bookmark removed"}


# --- Daily Job Seekers ---


@router.get("/daily-job-seekers", response_model=FavouriteDailyJobSeekerList)
async def list_favourite_daily_job_seekers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await FavouriteDailyJobSeekerService.get_all(
        db, skip=skip, limit=limit, user_id=current_user.id
    )
    total = await FavouriteDailyJobSeekerService.count(db, user_id=current_user.id)
    return FavouriteDailyJobSeekerList(daily_job_seekers=items, total=total)


@router.post("/daily-job-seekers", response_model=FavouriteDailyJobSeekerRead)
async def create_favourite_daily_job_seeker(
    favourite_in: FavouriteDailyJobSeekerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await FavouriteDailyJobSeekerService.create(
        db, favourite_in, user_id=current_user.id
    )


@router.delete("/daily-job-seekers/{daily_job_seeker_id}")
async def delete_favourite_daily_job_seeker(
    daily_job_seeker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = await FavouriteDailyJobSeekerService.delete_by_daily_job_seeker_id(
        db, daily_job_seeker_id=daily_job_seeker_id, user_id=current_user.id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"detail": "Bookmark removed"}
