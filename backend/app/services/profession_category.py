from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.models.profession import ProfessionCategory, Profession
from app.schemas.profession_category import ProfessionCategoryCreate, ProfessionCategoryUpdate
from typing import List, Optional


class ProfessionCategoryService:
    @staticmethod
    async def get_all(
        db: AsyncSession,
        is_active: Optional[bool] = None,
        only_active: Optional[bool] = None,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        top_level_only: bool = False,
        skip: int = 0,
        limit: int = 100
    ) -> List[ProfessionCategory]:
        """Get categories with optional filtering.
        
        Args:
            is_active: Filter by is_active field
            only_active: Alias for is_active (backward compat)
            search: Search in name fields
            parent_id: Filter by parent_id (get children of specific category)
            top_level_only: If True, only get categories where parent_id IS NULL
            skip/limit: Pagination
        """
        query = select(ProfessionCategory)

        # Handle both is_active and only_active for backward compatibility
        active_filter = is_active if is_active is not None else only_active
        if active_filter is not None:
            query = query.where(ProfessionCategory.is_active == active_filter)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    ProfessionCategory.name_uz.ilike(search_filter),
                    ProfessionCategory.name_ru.ilike(search_filter),
                    ProfessionCategory.name_en.ilike(search_filter),
                )
            )

        if parent_id is not None:
            query = query.where(ProfessionCategory.parent_id == parent_id)
        elif top_level_only:
            query = query.where(ProfessionCategory.parent_id.is_(None))

        result = await db.execute(
            query.options(selectinload(ProfessionCategory.children))
            .offset(skip).limit(limit).order_by(ProfessionCategory.id.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_tree(
        db: AsyncSession,
        is_active: Optional[bool] = None,
    ) -> List[ProfessionCategory]:
        """Get all top-level categories with their children loaded (tree structure).
        Used for frontend category display with subcategories.
        """
        query = select(ProfessionCategory).where(
            ProfessionCategory.parent_id.is_(None)
        ).options(selectinload(ProfessionCategory.children))

        if is_active is not None:
            query = query.where(ProfessionCategory.is_active == is_active)

        result = await db.execute(query.order_by(ProfessionCategory.id.asc()))
        categories = result.scalars().all()

        # If filtering by active, also filter children
        if is_active is not None:
            for cat in categories:
                cat.children = [c for c in cat.children if c.is_active == is_active]

        return categories

    @staticmethod
    async def count(
        db: AsyncSession,
        is_active: Optional[bool] = None,
        only_active: Optional[bool] = None,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        top_level_only: bool = False,
    ) -> int:
        query = select(func.count(ProfessionCategory.id))

        active_filter = is_active if is_active is not None else only_active
        if active_filter is not None:
            query = query.where(ProfessionCategory.is_active == active_filter)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    ProfessionCategory.name_uz.ilike(search_filter),
                    ProfessionCategory.name_ru.ilike(search_filter),
                    ProfessionCategory.name_en.ilike(search_filter),
                )
            )

        if parent_id is not None:
            query = query.where(ProfessionCategory.parent_id == parent_id)
        elif top_level_only:
            query = query.where(ProfessionCategory.parent_id.is_(None))

        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, category_id: int) -> Optional[ProfessionCategory]:
        result = await db.execute(
            select(ProfessionCategory)
            .where(ProfessionCategory.id == category_id)
            .options(selectinload(ProfessionCategory.children))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_professions_count(db: AsyncSession, category_id: int) -> int:
        """Get count of professions in a category (including subcategory professions)."""
        # Get direct professions count
        direct_count_query = select(func.count(Profession.id)).where(
            Profession.category_id == category_id
        )
        result = await db.execute(direct_count_query)
        count = result.scalar_one()

        # Get children IDs and count their professions too
        children_query = select(ProfessionCategory.id).where(
            ProfessionCategory.parent_id == category_id
        )
        children_result = await db.execute(children_query)
        child_ids = [row[0] for row in children_result.all()]

        if child_ids:
            child_prof_query = select(func.count(Profession.id)).where(
                Profession.category_id.in_(child_ids)
            )
            child_result = await db.execute(child_prof_query)
            count += child_result.scalar_one()

        return count

    @staticmethod
    async def create(db: AsyncSession, category_in: ProfessionCategoryCreate) -> ProfessionCategory:
        data = category_in.model_dump()
        category = ProfessionCategory(**data)
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return await ProfessionCategoryService.get_by_id(db, category.id)

    @staticmethod
    async def update(db: AsyncSession, category: ProfessionCategory, category_in: ProfessionCategoryUpdate) -> ProfessionCategory:
        update_data = category_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
        await db.commit()
        await db.refresh(category)
        return await ProfessionCategoryService.get_by_id(db, category.id)

    @staticmethod
    async def delete(db: AsyncSession, category: ProfessionCategory) -> None:
        await db.delete(category)
        await db.commit()
