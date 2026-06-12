from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.daily_job_seeker import Work
from app.schemas.daily_job_seeker import WorkCreate, WorkUpdate
from typing import List, Optional


class WorkService:
    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        only_active: bool = False,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        top_level_only: bool = False,
    ) -> List[Work]:
        query = select(Work).options(selectinload(Work.children))
        if only_active:
            query = query.where(Work.status == True)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Work.name_uz.ilike(search_filter))
                | (Work.name_ru.ilike(search_filter))
                | (Work.name_en.ilike(search_filter))
            )
        if parent_id is not None:
            query = query.where(Work.parent_id == parent_id)
        elif top_level_only:
            query = query.where(Work.parent_id.is_(None))
        result = await db.execute(query.offset(skip).limit(limit).order_by(Work.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def get_tree(db: AsyncSession, only_active: bool = False) -> List[Work]:
        """Get top-level works with children loaded."""
        query = select(Work).where(Work.parent_id.is_(None)).options(selectinload(Work.children))
        if only_active:
            query = query.where(Work.status == True)
        result = await db.execute(query.order_by(Work.id.asc()))
        works = result.scalars().all()
        if only_active:
            for w in works:
                w.children = [c for c in w.children if c.status]
        return works

    @staticmethod
    async def count(
        db: AsyncSession,
        only_active: bool = False,
        search: Optional[str] = None,
        parent_id: Optional[int] = None,
        top_level_only: bool = False,
    ) -> int:
        query = select(func.count(Work.id))
        if only_active:
            query = query.where(Work.status == True)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Work.name_uz.ilike(search_filter))
                | (Work.name_ru.ilike(search_filter))
                | (Work.name_en.ilike(search_filter))
            )
        if parent_id is not None:
            query = query.where(Work.parent_id == parent_id)
        elif top_level_only:
            query = query.where(Work.parent_id.is_(None))
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, work_id: int) -> Optional[Work]:
        result = await db.execute(
            select(Work).where(Work.id == work_id).options(selectinload(Work.children))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, work_in: WorkCreate) -> Work:
        work = Work(**work_in.model_dump())
        db.add(work)
        await db.commit()
        await db.refresh(work)
        return work

    @staticmethod
    async def update(db: AsyncSession, work: Work, work_in: WorkUpdate) -> Work:
        update_data = work_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work, field, value)
        await db.commit()
        await db.refresh(work)
        return work

    @staticmethod
    async def delete(db: AsyncSession, work: Work) -> None:
        await db.delete(work)
        await db.commit()
