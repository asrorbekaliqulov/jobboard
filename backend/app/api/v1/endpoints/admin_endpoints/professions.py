from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession import ProfessionService
from app.schemas.profession import ProfessionRead, ProfessionCreate, ProfessionUpdate, ProfessionList, ProfessionWithChildren
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=ProfessionList)
async def list_professions(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None, 
    is_active: bool | None = None,
    parent_id: Optional[int] = None,
    top_level_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    items = await ProfessionService.get_all(db, only_active=is_active, search=search, skip=skip, limit=limit, parent_id=parent_id, top_level_only=top_level_only)
    total = await ProfessionService.count(db, only_active=is_active, search=search, parent_id=parent_id, top_level_only=top_level_only)
    return {"items": items, "total": total}

@router.get("/tree", response_model=List[ProfessionWithChildren])
async def get_professions_tree(db: AsyncSession = Depends(get_db)):
    """Get active professions as tree (top-level with children)."""
    return await ProfessionService.get_tree(db, only_active=True)

@router.post("/", response_model=ProfessionRead)
async def create_profession(profession_in: ProfessionCreate, db: AsyncSession = Depends(get_db)):
    if profession_in.parent_id:
        parent = await ProfessionService.get_by_id(db, profession_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent profession not found")
    return await ProfessionService.create(db, profession_in)

@router.put("/{profession_id}", response_model=ProfessionRead)
async def update_profession(profession_id: int, profession_in: ProfessionUpdate, db: AsyncSession = Depends(get_db)):
    profession = await ProfessionService.get_by_id(db, profession_id)
    if not profession:
        raise HTTPException(status_code=404, detail="Profession not found")
    if profession_in.parent_id and profession_in.parent_id == profession_id:
        raise HTTPException(status_code=400, detail="Cannot be its own parent")
    return await ProfessionService.update(db, profession, profession_in)

@router.delete("/{profession_id}")
async def delete_profession(profession_id: int, db: AsyncSession = Depends(get_db)):
    profession = await ProfessionService.get_by_id(db, profession_id)
    if not profession:
        raise HTTPException(status_code=404, detail="Profession not found")
    await ProfessionService.delete(db, profession)
    return {"detail": "Profession deleted"}



# ==================== AI Auto-Categorize ====================

@router.post("/ai-categorize/preview")
async def ai_categorize_preview(db: AsyncSession = Depends(get_db)):
    """
    AI avtomatik saralash - OLDINDAN KO'RISH.
    Hech narsa o'zgarmaydi, faqat AI taklif qilgan guruhlarni ko'rsatadi.
    """
    from app.services.ai_categorize import AICategorizeService
    from app.core.config import settings
    if not settings.ai_enabled:
        raise HTTPException(status_code=503, detail="AI xizmati sozlanmagan")
    return await AICategorizeService.generate_categories(db)


@router.post("/ai-categorize/apply")
async def ai_categorize_apply(groups: list = Body(...), db: AsyncSession = Depends(get_db)):
    """
    AI saralashni TASDIQLASH va bazaga qo'llash.
    Admin preview ko'rib, tasdiqlagan guruhlarni yuboradi.
    """
    from app.services.ai_categorize import AICategorizeService
    from app.core.config import settings
    if not settings.ai_enabled:
        raise HTTPException(status_code=503, detail="AI xizmati sozlanmagan")
    return await AICategorizeService.apply_categories(db, groups)


@router.post("/ai-categorize/revert")
async def ai_categorize_revert(db: AsyncSession = Depends(get_db)):
    """
    AI saralashni BEKOR QILISH.
    Barcha parent_id larni NULL ga o'zgartiradi (kasblar o'chirilmaydi).
    """
    from app.services.ai_categorize import AICategorizeService
    return await AICategorizeService.revert_categories(db)
