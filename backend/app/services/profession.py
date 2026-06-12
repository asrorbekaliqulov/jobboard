from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.models.profession import Profession
from app.schemas.profession import ProfessionCreate, ProfessionUpdate
from typing import List, Optional


class ProfessionService:
    @staticmethod
    async def get_all(
        db: AsyncSession,
        only_active: Optional[bool] = None,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        top_level_only: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Profession]:
        """Get professions with optional filtering.

        Args:
            only_active: filter by is_active
            search: search in name fields
            parent_id: get children of a specific profession
            top_level_only: only root professions (parent_id IS NULL)
        """
        query = select(Profession)

        if only_active is not None:
            query = query.where(Profession.is_active == only_active)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )

        if parent_id is not None:
            query = query.where(Profession.parent_id == parent_id)
        elif top_level_only:
            query = query.where(Profession.parent_id.is_(None))

        result = await db.execute(
            query.options(selectinload(Profession.children))
            .offset(skip)
            .limit(limit)
            .order_by(Profession.id.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_tree(
        db: AsyncSession,
        only_active: Optional[bool] = None,
    ) -> List[Profession]:
        """Get all top-level professions with their children (tree structure).
        Used for frontend category display and filtering.
        """
        query = (
            select(Profession)
            .where(Profession.parent_id.is_(None))
            .options(selectinload(Profession.children))
        )

        if only_active is not None:
            query = query.where(Profession.is_active == only_active)

        result = await db.execute(query.order_by(Profession.id.asc()))
        professions = result.scalars().all()

        # If filtering by active, also filter children
        if only_active is not None:
            for prof in professions:
                prof.children = [c for c in prof.children if c.is_active == only_active]

        return professions

    @staticmethod
    async def count(
        db: AsyncSession,
        only_active: Optional[bool] = None,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        top_level_only: bool = False,
    ) -> int:
        query = select(func.count(Profession.id))

        if only_active is not None:
            query = query.where(Profession.is_active == only_active)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )

        if parent_id is not None:
            query = query.where(Profession.parent_id == parent_id)
        elif top_level_only:
            query = query.where(Profession.parent_id.is_(None))

        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, profession_id: int) -> Optional[Profession]:
        result = await db.execute(
            select(Profession)
            .where(Profession.id == profession_id)
            .options(selectinload(Profession.children))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, profession_in: ProfessionCreate) -> Profession:
        profession = Profession(**profession_in.model_dump())
        db.add(profession)
        await db.commit()
        await db.refresh(profession)
        return profession

    @staticmethod
    async def update(db: AsyncSession, profession: Profession, profession_in: ProfessionUpdate) -> Profession:
        update_data = profession_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profession, field, value)
        await db.commit()
        await db.refresh(profession)
        return profession

    @staticmethod
    async def delete(db: AsyncSession, profession: Profession) -> None:
        await db.delete(profession)
        await db.commit()
