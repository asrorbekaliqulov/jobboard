from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.vacancy import VacancyStatus
from app.services.vacancy import VacancyService
from app.services.storage import upload_file
from app.schemas.vacancy import VacancyCreate, VacancyUpdate, VacancyRead, VacancyList
from typing import Optional, Literal
from pathlib import Path

router = APIRouter()

@router.get("/", response_model=VacancyList)
async def list_vacancies(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    profession_id: Optional[int] = None,
    category_id: Optional[int] = None,
    region_id: Optional[int] = None,
    status: Optional[VacancyStatus] = None,
    search: Optional[str] = None,
    work_format: Optional[str] = None,
    work_type: Optional[str] = None,
    salary_range: Optional[str] = None,
    experience: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List vacancies with filters. 
    By default, only ACTIVE vacancies are shown to public.
    If user_id is provided, it filters by that user.
    category_id: filter by profession category (includes subcategory professions).
    """
    # If category_id is provided, resolve to profession_ids (parent profession + its children)
    category_profession_ids = None
    if category_id and not profession_id:
        from app.models.profession import Profession as ProfModel
        from sqlalchemy import select as sa_select
        # category_id here means a parent profession id
        prof_ids = [category_id]
        children_q = await db.execute(
            sa_select(ProfModel.id).where(ProfModel.parent_id == category_id)
        )
        prof_ids.extend([row[0] for row in children_q.all()])
        category_profession_ids = prof_ids

    # Parse salary range
    salary_from, salary_till = None, None
    if salary_range:
        try:
            if salary_range == "1-3M":
                salary_from, salary_till = 1000000, 3000000
            elif salary_range == "3-5M":
                salary_from, salary_till = 3000000, 5000000
            elif salary_range == "5-10M":
                salary_from, salary_till = 5000000, 10000000
            elif salary_range == "10M+":
                salary_from = 10000000
        except:
            pass
    
    # Parse experience range
    exp_from, exp_till = None, None
    if experience:
        try:
            if experience == "0-1":
                exp_from, exp_till = 0, 1
            elif experience == "2-3":
                exp_from, exp_till = 2, 3
            elif experience == "4-7":
                exp_from, exp_till = 4, 7
            elif experience == "8+":
                exp_from = 8
        except:
            pass

    vacancies = await VacancyService.get_all(
        db, 
        skip=skip, 
        limit=limit, 
        user_id=user_id,
        profession_id=profession_id,
        profession_ids=category_profession_ids,
        region_id=region_id,
        status=status,
        search=search,
        work_format=work_format,
        work_type=work_type,
        salary_from=salary_from,
        salary_till=salary_till,
        exp_from=exp_from,
        exp_till=exp_till
    )
    total = await VacancyService.count(
        db,
        user_id=user_id,
        profession_id=profession_id,
        profession_ids=category_profession_ids,
        region_id=region_id,
        status=status,
        search=search,
        work_format=work_format,
        work_type=work_type,
        salary_from=salary_from,
        salary_till=salary_till,
        exp_from=exp_from,
        exp_till=exp_till
    )
    return VacancyList(items=vacancies, total=total)

@router.post("/", response_model=VacancyRead)
async def create_vacancy(
    vacancy_in: VacancyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new vacancy.
    """
    return await VacancyService.create(db, vacancy_in, user_id=current_user.id)

@router.get("/{vacancy_id}", response_model=VacancyRead)
async def get_vacancy(
    vacancy_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get vacancy by ID.
    """
    vacancy = await VacancyService.get_by_id(db, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    return vacancy

@router.put("/{vacancy_id}", response_model=VacancyRead)
async def update_vacancy(
    vacancy_id: int,
    vacancy_in: VacancyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a vacancy. Only owner can update.
    """
    vacancy = await VacancyService.get_by_id(db, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    
    if vacancy.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this vacancy"
        )
    
    return await VacancyService.update(db, vacancy, vacancy_in)

@router.delete("/{vacancy_id}")
async def delete_vacancy(
    vacancy_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a vacancy. Only owner can delete.
    """
    vacancy = await VacancyService.get_by_id(db, vacancy_id)
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    
    if vacancy.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this vacancy"
        )
    
    await VacancyService.delete(db, vacancy)
    return {"detail": "Vacancy deleted"}

@router.post("/upload")
async def upload_vacancy_file(
    file: UploadFile = File(...),
    type: Literal["image", "video"] = Query("image", description="Upload type: image or video"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image or video file for a vacancy. Uses Google Cloud Storage when GCS_BUCKET_NAME is set.
    """
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

    content_length = file.headers.get("content-length")
    if content_length and int(content_length) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB"
        )

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum size is 50MB"
        )

    prefix = "vacancy_images" if type == "image" else "vacancy_videos"
    file_extension = Path(file.filename or "file").suffix
    file_name = f"vacancy_{current_user.id}_{os.urandom(4).hex()}{file_extension}"
    content_type = file.content_type

    url = upload_file(file.file, prefix, file_name, content_type)

    return {"url": url}
