from typing import List, Optional

from app.models.daily_job_seeker import DailyJobSeeker, daily_job_seeker_districts
from app.models.favourite import FavouriteDailyJobSeeker
from app.schemas.favourite import FavouriteDailyJobSeekerCreate
from sqlalchemy import delete, func, select
from sqlalchemy.exc import MultipleResultsFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.location import District


class FavouriteDailyJobSeekerService:
    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
    ) -> List[FavouriteDailyJobSeeker]:
        query = select(FavouriteDailyJobSeeker).options(
            selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                DailyJobSeeker.profession
            ),
            selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                DailyJobSeeker.region
            ),
            selectinload(FavouriteDailyJobSeeker.daily_job_seeker)
            .selectinload(DailyJobSeeker.districts)
            .selectinload(District.region),
            selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                DailyJobSeeker.user
            ),
            selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                DailyJobSeeker.works
            ),
        )

        if user_id:
            query = query.where(FavouriteDailyJobSeeker.user_id == user_id)

        result = await db.execute(
            query.offset(skip)
            .limit(limit)
            .order_by(FavouriteDailyJobSeeker.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def count(db: AsyncSession, user_id: Optional[int] = None) -> int:
        query = select(func.count(FavouriteDailyJobSeeker.id))
        if user_id:
            query = query.where(FavouriteDailyJobSeeker.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, favourite_id: int
    ) -> Optional[FavouriteDailyJobSeeker]:
        query = (
            select(FavouriteDailyJobSeeker)
            .where(FavouriteDailyJobSeeker.id == favourite_id)
            .options(
                selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                    DailyJobSeeker.profession
                ),
                selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                    DailyJobSeeker.region
                ),
                selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                    DailyJobSeeker.user
                ),
                selectinload(FavouriteDailyJobSeeker.daily_job_seeker)
                .selectinload(DailyJobSeeker.districts).
                selectinload(District.region),
                selectinload(FavouriteDailyJobSeeker.daily_job_seeker).selectinload(
                    DailyJobSeeker.works
                ),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession, favourite_in: FavouriteDailyJobSeekerCreate, user_id: int
    ) -> FavouriteDailyJobSeeker:
        query = select(FavouriteDailyJobSeeker).where(
            FavouriteDailyJobSeeker.daily_job_seeker_id
            == favourite_in.daily_job_seeker_id,
            FavouriteDailyJobSeeker.user_id == user_id,
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            return await FavouriteDailyJobSeekerService.get_by_id(db, existing.id)

        favourite = FavouriteDailyJobSeeker(
            **favourite_in.model_dump(), user_id=user_id
        )
        db.add(favourite)
        await db.commit()
        return await FavouriteDailyJobSeekerService.get_by_id(db, favourite.id)

    @staticmethod
    async def delete_by_daily_job_seeker_id(
        db: AsyncSession, daily_job_seeker_id: int, user_id: int
    ) -> bool:
        query = select(FavouriteDailyJobSeeker).where(
            FavouriteDailyJobSeeker.daily_job_seeker_id == daily_job_seeker_id,
            FavouriteDailyJobSeeker.user_id == user_id,
        )
        result = await db.execute(query)
        try:
            favourite = result.scalar_one_or_none()
            if favourite:
                await db.delete(favourite)
                await db.commit()
                return True
        except MultipleResultsFound:
            await db.execute(
                delete(FavouriteDailyJobSeeker).where(
                    FavouriteDailyJobSeeker.daily_job_seeker_id == daily_job_seeker_id,
                    FavouriteDailyJobSeeker.user_id == user_id,
                )
            )
            await db.commit()
            return True
        return False
