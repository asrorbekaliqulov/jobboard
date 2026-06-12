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
from typing import Optional

router = APIRouter()


@router.get("/", response_model=ProfessionCategoryList)
async def list_profession_categories(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    parent_id: Optional[int] = None,
    top_level_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """List profession categories with optional filters.
    
    - parent_id: filter to get children of a specific category
    - top_level_only: if true, only get root categories (no parent)
    """
    items = await ProfessionCategoryService.get_all(
        db, is_active=is_active, search=search,
        parent_id=parent_id, top_level_only=top_level_only,
        skip=skip, limit=limit
    )
    total = await ProfessionCategoryService.count(
        db, is_active=is_active, search=search,
        parent_id=parent_id, top_level_only=top_level_only
    )
    return {"items": items, "total": total}


@router.post("/", response_model=ProfessionCategoryRead)
async def create_profession_category(
    category_in: ProfessionCategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a profession category. Set parent_id to make it a subcategory."""
    if category_in.parent_id is not None:
        parent = await ProfessionCategoryService.get_by_id(db, category_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
    return await ProfessionCategoryService.create(db, category_in)


@router.put("/{category_id}", response_model=ProfessionCategoryRead)
async def update_profession_category(
    category_id: int,
    category_in: ProfessionCategoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    category = await ProfessionCategoryService.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    # Prevent circular reference: can't set parent to itself or its own child
    if category_in.parent_id is not None:
        if category_in.parent_id == category_id:
            raise HTTPException(status_code=400, detail="Category cannot be its own parent")
        parent = await ProfessionCategoryService.get_by_id(db, category_in.parent_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
        if parent.parent_id == category_id:
            raise HTTPException(status_code=400, detail="Circular reference detected")
    return await ProfessionCategoryService.update(db, category, category_in)


@router.delete("/{category_id}")
async def delete_profession_category(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    category = await ProfessionCategoryService.get_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await ProfessionCategoryService.delete(db, category)
    return {"detail": "Category deleted"}
