from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession_category import ProfessionCategoryService
from app.schemas.profession_category import (
    ProfessionCategoryRead, 
    ProfessionCategoryCreate, 
    ProfessionCategoryUpdate, 
    ProfessionCategoryList
)
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=ProfessionCategoryList)
async def list_profession_categories(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None, 
    is_active: bool | None = None, 
    db: AsyncSession = Depends(get_db)
):
    items = await ProfessionCategoryService.get_all(db, only_active=is_active, search=search, skip=skip, limit=limit)
    total = await ProfessionCategoryService.count(db, only_active=is_active, search=search)
    return {"items": items, "total": total}

@router.post("/", response_model=ProfessionCategoryRead)
async def create_profession_category(category_in: ProfessionCategoryCreate, db: AsyncSession = Depends(get_db)):
    return await ProfessionCategoryService.create(db, category_in)

@router.put("/{category_id}", response_model=ProfessionCategoryRead)
async def update_profession_category(category_id: int, category_in: ProfessionCategoryUpdate, db: AsyncSession = Depends(get_db)):
    category = await ProfessionCategoryService.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return await ProfessionCategoryService.update(db, category, category_in)

@router.delete("/{category_id}")
async def delete_profession_category(category_id: int, db: AsyncSession = Depends(get_db)):
    category = await ProfessionCategoryService.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await ProfessionCategoryService.delete(db, category)
    return {"detail": "Category deleted"}
