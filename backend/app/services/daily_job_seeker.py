from typing import List, Optional

from app.models.daily_job_seeker import DailyJobSeeker, Work
from app.models.location import District
from app.models.resume import ResumeStatus
from app.schemas.daily_job_seeker import DailyJobSeekerCreate, DailyJobSeekerUpdate
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class DailyJobSeekerService:
    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        profession_id: Optional[int] = None,
        region_id: Optional[int] = None,
        status: Optional[ResumeStatus] = None,
        search: Optional[str] = None,
    ) -> List[DailyJobSeeker]:
        query = select(DailyJobSeeker).options(
            selectinload(DailyJobSeeker.profession),
            selectinload(DailyJobSeeker.region),
            selectinload(DailyJobSeeker.districts).selectinload(District.region),
            selectinload(DailyJobSeeker.user),
            selectinload(DailyJobSeeker.works),
        )

        if user_id:
            query = query.where(DailyJobSeeker.user_id == user_id)
        if profession_id:
            query = query.where(DailyJobSeeker.profession_id == profession_id)
        if region_id:
            query = query.where(DailyJobSeeker.region_id == region_id)
        if status:
            query = query.where(DailyJobSeeker.status == status)
        elif not user_id:
            query = query.where(DailyJobSeeker.status == ResumeStatus.ACTIVE)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    DailyJobSeeker.first_name.ilike(search_filter),
                    DailyJobSeeker.last_name.ilike(search_filter),
                    DailyJobSeeker.description.ilike(search_filter),
                )
            )

        result = await db.execute(
            query.offset(skip).limit(limit).order_by(DailyJobSeeker.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: Optional[int] = None,
        profession_id: Optional[int] = None,
        region_id: Optional[int] = None,
        status: Optional[ResumeStatus] = None,
        search: Optional[str] = None,
    ) -> int:
        query = select(func.count(DailyJobSeeker.id))

        if user_id:
            query = query.where(DailyJobSeeker.user_id == user_id)
        if profession_id:
            query = query.where(DailyJobSeeker.profession_id == profession_id)
        if region_id:
            query = query.where(DailyJobSeeker.region_id == region_id)
        if status:
            query = query.where(DailyJobSeeker.status == status)
        elif not user_id:
            query = query.where(DailyJobSeeker.status == ResumeStatus.ACTIVE)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    DailyJobSeeker.first_name.ilike(search_filter),
                    DailyJobSeeker.last_name.ilike(search_filter),
                    DailyJobSeeker.description.ilike(search_filter),
                )
            )
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, daily_job_seeker_id: int
    ) -> Optional[DailyJobSeeker]:
        query = (
            select(DailyJobSeeker)
            .where(DailyJobSeeker.id == daily_job_seeker_id)
            .options(
                selectinload(DailyJobSeeker.profession),
                selectinload(DailyJobSeeker.region),
                selectinload(DailyJobSeeker.districts),
                selectinload(DailyJobSeeker.user),
                selectinload(DailyJobSeeker.works),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(
        db: AsyncSession, daily_job_seeker_in: DailyJobSeekerCreate, user_id: int
    ) -> DailyJobSeeker:
        payload = daily_job_seeker_in.model_dump(exclude={"work_ids", "district_ids"})
        daily_job_seeker = DailyJobSeeker(**payload, user_id=user_id)

        if daily_job_seeker_in.work_ids:
            works_result = await db.execute(
                select(Work).where(Work.id.in_(daily_job_seeker_in.work_ids))
            )
            daily_job_seeker.works = list(works_result.scalars().all())

        if daily_job_seeker_in.district_ids:
            districts_result = await db.execute(
                select(District).where(
                    District.id.in_(daily_job_seeker_in.district_ids)
                )
            )
            daily_job_seeker.districts = list(districts_result.scalars().all())

        db.add(daily_job_seeker)
        await db.commit()
        return await DailyJobSeekerService.get_by_id(db, daily_job_seeker.id)

    @staticmethod
    async def update(
        db: AsyncSession,
        daily_job_seeker: DailyJobSeeker,
        daily_job_seeker_in: DailyJobSeekerUpdate,
    ) -> DailyJobSeeker:
        update_data = daily_job_seeker_in.model_dump(
            exclude_unset=True, exclude={"work_ids", "district_ids"}
        )
        for field, value in update_data.items():
            setattr(daily_job_seeker, field, value)

        if daily_job_seeker_in.work_ids is not None:
            if daily_job_seeker_in.work_ids:
                works_result = await db.execute(
                    select(Work).where(Work.id.in_(daily_job_seeker_in.work_ids))
                )
                daily_job_seeker.works = list(works_result.scalars().all())
            else:
                daily_job_seeker.works = []

        if daily_job_seeker_in.district_ids is not None:
            if daily_job_seeker_in.district_ids:
                districts_result = await db.execute(
                    select(District).where(
                        District.id.in_(daily_job_seeker_in.district_ids)
                    )
                )
                daily_job_seeker.districts = list(districts_result.scalars().all())
            else:
                daily_job_seeker.districts = []

        await db.commit()
        return await DailyJobSeekerService.get_by_id(db, daily_job_seeker.id)

    @staticmethod
    async def delete(db: AsyncSession, daily_job_seeker: DailyJobSeeker) -> None:
        await db.delete(daily_job_seeker)
        await db.commit()

    @staticmethod
    async def increment_view_count(
        db: AsyncSession, daily_job_seeker: DailyJobSeeker
    ) -> None:
        """Increment the view count for a daily job seeker profile."""
        daily_job_seeker.viewed_count = (daily_job_seeker.viewed_count or 0) + 1
        await db.commit()
