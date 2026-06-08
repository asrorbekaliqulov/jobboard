from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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
    ) -> List[Work]:
        query = select(Work)
        if only_active:
            query = query.where(Work.status == True)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Work.name_uz.ilike(search_filter))
                | (Work.name_ru.ilike(search_filter))
                | (Work.name_en.ilike(search_filter))
            )
        result = await db.execute(query.offset(skip).limit(limit).order_by(Work.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        only_active: bool = False,
        search: Optional[str] = None,
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
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, work_id: int) -> Optional[Work]:
        result = await db.execute(select(Work).where(Work.id == work_id))
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
