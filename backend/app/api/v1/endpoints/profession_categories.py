from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.profession_category import ProfessionCategoryService
from app.schemas.profession_category import ProfessionCategoryTree
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ProfessionCategoryTree])
async def get_categories_tree(db: AsyncSession = Depends(get_db)):
    """
    Get all active profession categories as a tree structure.
    Returns top-level categories with their active subcategories nested.
    Used by the frontend for category display and filtering.
    """
    categories = await ProfessionCategoryService.get_tree(db, is_active=True)
    
    # Build response with professions_count
    result = []
    for cat in categories:
        children_data = []
        for child in cat.children:
            child_count = await ProfessionCategoryService.get_professions_count(db, child.id)
            children_data.append({
                "id": child.id,
                "name_uz": child.name_uz,
                "name_ru": child.name_ru,
                "name_en": child.name_en,
                "is_active": child.is_active,
                "parent_id": child.parent_id,
                "professions_count": child_count,
            })
        
        cat_count = await ProfessionCategoryService.get_professions_count(db, cat.id)
        result.append({
            "id": cat.id,
            "name_uz": cat.name_uz,
            "name_ru": cat.name_ru,
            "name_en": cat.name_en,
            "is_active": cat.is_active,
            "parent_id": cat.parent_id,
            "professions_count": cat_count,
            "children": children_data,
        })
    
    return result


@router.get("/{category_id}/subcategories", response_model=List[ProfessionCategoryTree])
async def get_subcategories(category_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get subcategories of a specific category.
    """
    items = await ProfessionCategoryService.get_all(
        db, is_active=True, parent_id=category_id, limit=100
    )
    result = []
    for cat in items:
        cat_count = await ProfessionCategoryService.get_professions_count(db, cat.id)
        result.append({
            "id": cat.id,
            "name_uz": cat.name_uz,
            "name_ru": cat.name_ru,
            "name_en": cat.name_en,
            "is_active": cat.is_active,
            "parent_id": cat.parent_id,
            "professions_count": cat_count,
            "children": [],
        })
    return result
