from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.profession import ProfessionCategory
from app.schemas.profession_category import ProfessionCategoryCreate, ProfessionCategoryUpdate
from typing import List, Optional

class ProfessionCategoryService:
    @staticmethod
    async def get_all(db: AsyncSession, is_active: bool | None = None, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[ProfessionCategory]:
        query = select(ProfessionCategory, func.count(Profession.id).label("professions_count")
        ).outerjoin(Profession, ProfessionCategory.id == Profession.category_id).group_by(ProfessionCategory.id)
        if is_active is not None:
            query = query.where(ProfessionCategory.is_active == is_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    ProfessionCategory.name_uz.ilike(search_filter),
                    ProfessionCategory.name_ru.ilike(search_filter),
                    ProfessionCategory.name_en.ilike(search_filter),
                )
            )
        result = await db.execute(query.offset(skip).limit(limit).order_by(ProfessionCategory.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def count(db: AsyncSession, is_active: bool | None = None, search: Optional[str] = None) -> int:
        from sqlalchemy import func
        query = select(func.count(professions.id).label("professions_count"))
        if is_active is not None:
            query = query.where(ProfessionCategory.is_active == is_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    ProfessionCategory.name_uz.ilike(search_filter),
                    ProfessionCategory.name_ru.ilike(search_filter),
                    ProfessionCategory.name_en.ilike(search_filter),
                )
            )
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, category_id: int) -> Optional[ProfessionCategory]:
        result = await db.execute(
            select(ProfessionCategory, func.count(Profession.id).label("professions_count"))
            .where(ProfessionCategory.id == category_id)
            .outerjoin(Profession, ProfessionCategory.id == Profession.category_id)
            .group_by(ProfessionCategory.id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, category_in: ProfessionCategoryCreate) -> ProfessionCategory:
        category = ProfessionCategory(**category_in.model_dump())
        db.add(category)
        await db.commit()
        return await ProfessionCategoryService.get_by_id(db, category.id)

    @staticmethod
    async def update(db: AsyncSession, category: ProfessionCategory, category_in: ProfessionCategoryUpdate) -> ProfessionCategory:
        update_data = category_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
        await db.commit()
        return await ProfessionCategoryService.get_by_id(db, category.id)

    @staticmethod
    async def delete(db: AsyncSession, category: ProfessionCategory) -> None:
        await db.delete(category)
        await db.commit()
