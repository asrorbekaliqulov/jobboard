from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
import os
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.resume import ResumeStatus
from app.services.resume import ResumeService
from app.services.storage import upload_file
from app.schemas.resume import ResumeCreate, ResumeUpdate, ResumeRead, ResumeList
from app.services.deeplink import resume_deeplink, telegram_share_url
from typing import Optional, Literal
from pathlib import Path
from app.core.logging_config import setup_logging, logger
# Initialize logging
setup_logging()
router = APIRouter()


def _enum_val(v):
    return getattr(v, "value", v)


def _safe_named(obj):
    if obj is None:
        return None
    return {
        "id": getattr(obj, "id", None),
        "name_uz": getattr(obj, "name_uz", None),
        "name_ru": getattr(obj, "name_ru", None),
        "name_en": getattr(obj, "name_en", None),
        "is_active": getattr(obj, "is_active", True),
    }


def _safe_resume_payload(r) -> dict:
    """Best-effort, never-failing serialization of a resume ORM row."""
    prof = getattr(r, "profession", None)
    region = getattr(r, "region", None)
    user = getattr(r, "user", None)
    region_payload = None
    if region is not None:
        region_payload = {**_safe_named(region), "districts_count": 0}
    user_payload = None
    if user is not None:
        user_payload = {
            "id": getattr(user, "id", None),
            "telegram_id": (str(getattr(user, "telegram_id", "")) if getattr(user, "telegram_id", None) is not None else None),
            "username": getattr(user, "username", None),
            "first_name": getattr(user, "first_name", None),
            "last_name": getattr(user, "last_name", None),
            "photo_url": getattr(user, "photo_url", None),
            "phone": getattr(user, "phone", None),
        }
    return {
        "id": getattr(r, "id", None),
        "first_name": getattr(r, "first_name", None),
        "last_name": getattr(r, "last_name", None),
        "middle_name": getattr(r, "middle_name", None),
        "age": getattr(r, "age", None),
        "profession_id": getattr(r, "profession_id", None),
        "region_id": getattr(r, "region_id", None),
        "gender": _enum_val(getattr(r, "gender", None)),
        "experience": getattr(r, "experience", None),
        "description": getattr(r, "description", None),
        "phone": getattr(r, "phone", None),
        "telegram": getattr(r, "telegram", None),
        "email": getattr(r, "email", None),
        "portfolio": getattr(r, "portfolio", None),
        "video": getattr(r, "video", None),
        "status": _enum_val(getattr(r, "status", None)),
        "user_id": getattr(r, "user_id", None),
        "viewed_count": getattr(r, "viewed_count", 0),
        "created_at": getattr(r, "created_at", None),
        "updated_at": getattr(r, "updated_at", None),
        "profession": _safe_named(prof),
        "region": region_payload,
        "user": user_payload,
    }

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
    resume = await ResumeService.create(db, resume_in, user_id=current_user.id)
    # Rezyume ma'lumotlarini JIMGINA bot profiliga ham saqlaymiz (AI uchun).
    # Bu asosiy oqimni hech qachon buzmaydi (ichida try/except bor).
    from app.services.bot_profile_sync import sync_resume_to_bot_profile
    await sync_resume_to_bot_profile(db, resume)
    return resume

@router.get("/{resume_id}")
async def get_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get resume by ID.

    Defensive serialization: never 500 on legacy/partial rows.
    """
    resume = await ResumeService.get_by_id(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    try:
        return JSONResponse(content=jsonable_encoder(ResumeRead.model_validate(resume)))
    except Exception as e:
        logger.error(f"Resume {resume_id} strict serialization failed, using fallback: {e}")
        return JSONResponse(content=jsonable_encoder(_safe_resume_payload(resume)))


@router.get("/{resume_id}/share")
async def share_resume(
    resume_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Return a shareable deep link for a resume (used by the Mini App share button)."""
    from sqlalchemy import select as _select
    from app.models.resume import Resume as _R
    from app.models.profession import Profession as _P
    row = (await db.execute(
        _select(_R.first_name, _R.last_name, _P.name_uz)
        .join(_P, _R.profession_id == _P.id, isouter=True)
        .where(_R.id == resume_id)
    )).first()
    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")
    first, last, prof = row
    name = " ".join([x for x in [first, last] if x]).strip()
    title = " — ".join([x for x in [prof, name] if x]) or "Rezyume"
    link = resume_deeplink(resume_id)
    return {"deeplink": link, "share_url": telegram_share_url(link, title), "text": title}

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
