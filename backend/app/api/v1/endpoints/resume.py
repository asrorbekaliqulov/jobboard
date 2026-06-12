from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.resume import ResumeStatus
from app.services.resume import ResumeService
from app.services.storage import upload_file
from app.schemas.resume import ResumeCreate, ResumeUpdate, ResumeRead, ResumeList
from typing import Optional, Literal
from pathlib import Path
from app.core.logging_config import setup_logging, logger
# Initialize logging
setup_logging()
router = APIRouter()

@router.get("/", response_model=ResumeList)
async def list_resumes(
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    profession_id: Optional[int] = None,
    category_id: Optional[int] = None,
    region_id: Optional[int] = None,
    gender: Optional[str] = None,
    status: Optional[ResumeStatus] = None,
    search: Optional[str] = None,
    age_range: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List resumes with filters. 
    By default, only ACTIVE resumes are shown to public.
    If user_id is provided, it filters by that user.
    category_id: filter by profession category (includes subcategory professions).
    """
    # If category_id is provided, resolve to profession_ids (parent profession + its children)
    category_profession_ids = None
    if category_id and not profession_id:
        from app.models.profession import Profession as ProfModel
        from sqlalchemy import select as sa_select
        prof_ids = [category_id]
        children_q = await db.execute(
            sa_select(ProfModel.id).where(ProfModel.parent_id == category_id)
        )
        prof_ids.extend([row[0] for row in children_q.all()])
        category_profession_ids = prof_ids

    age_from, age_till = None, None
    if age_range:
        try:
            age_from, age_till = [int(x) for x in age_range.split('-')]
        except:
            raise HTTPException(status_code=400, detail="Invalid age range format")

    resumes = await ResumeService.get_all(
        db,
        skip=skip, 
        limit=limit, 
        user_id=user_id,
        profession_id=profession_id,
        profession_ids=category_profession_ids,
        region_id=region_id,
        gender=gender,
        status=status,
        search=search,
        age_from=age_from,
        age_till=age_till
    )
    total = await ResumeService.count(
        db,
        user_id=user_id,
        profession_id=profession_id,
        profession_ids=category_profession_ids,
        region_id=region_id,
        gender=gender,
        status=status,
        search=search,
        age_from=age_from,
        age_till=age_till
    )
    return ResumeList(items=resumes, total=total)

@router.post("/", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
async def create_resume(
    resume_in: ResumeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new resume.
    """
    return await ResumeService.create(db, resume_in, user_id=current_user.id)

@router.get("/{resume_id}", response_model=ResumeRead)
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get resume by ID.
    """
    resume = await ResumeService.get_by_id(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.put("/{resume_id}", response_model=ResumeRead)
async def update_resume(
    resume_id: int,
    resume_in: ResumeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a resume. Only owner or admin can update.
    """
    logger.error(f"Updated resume data: {resume_in=}")
    resume = await ResumeService.get_by_id(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if resume.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this resume"
        )
    
    return await ResumeService.update(db, resume, resume_in)

@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a resume. Only owner or admin can delete.
    """
    resume = await ResumeService.get_by_id(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if resume.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this resume"
        )
    
    await ResumeService.delete(db, resume)
    return {}

@router.post("/upload")
async def upload_portfolio(
    file: UploadFile = File(...),
    type: Literal["portfolio", "video"] = Query("portfolio", description="Upload type: portfolio or video"),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a portfolio or video file. Uses Google Cloud Storage when GCS_BUCKET_NAME is set.
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

    prefix = "portfolios" if type == "portfolio" else "videos"
    file_extension = Path(file.filename or "file").suffix
    file_name = f"resume_{current_user.id}_{os.urandom(4).hex()}{file_extension}"
    content_type = file.content_type

    url = upload_file(file.file, prefix, file_name, content_type)

    logger.error(f"Uploaded file to {url}")


    return {"url": url}
