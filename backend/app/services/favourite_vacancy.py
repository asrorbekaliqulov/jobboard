from typing import List, Optional

from app.models.favourite import FavouriteVacancy
from app.models.vacancy import Vacancy
from app.schemas.favourite import FavouriteVacancyCreate
from sqlalchemy import delete, exists, func, or_, select
from sqlalchemy.exc import MultipleResultsFound, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class FavouriteVacancyService:
    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
    ) -> List[FavouriteVacancy]:
        query = select(FavouriteVacancy).options(
            selectinload(FavouriteVacancy.vacancy).selectinload(Vacancy.profession),
            selectinload(FavouriteVacancy.vacancy).selectinload(Vacancy.region),
            selectinload(FavouriteVacancy.vacancy).selectinload(Vacancy.user),
        )

        if user_id:
            query = query.where(FavouriteVacancy.user_id == user_id)

        result = await db.execute(
            query.offset(skip).limit(limit).order_by(FavouriteVacancy.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: Optional[int] = None,
    ) -> int:
        query = select(func.count(FavouriteVacancy.id))

        if user_id:
            query = query.where(FavouriteVacancy.user_id == user_id)

        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(
        db: AsyncSession, vacancy_id: int
    ) -> Optional[FavouriteVacancy]:
        query = (
            select(FavouriteVacancy)
            .where(FavouriteVacancy.id == vacancy_id)
            .options(
                selectinload(FavouriteVacancy.vacancy).selectinload(Vacancy.profession),
                selectinload(FavouriteVacancy.vacancy).selectinload(Vacancy.region),
                selectinload(FavouriteVacancy.vacancy).selectinload(Vacancy.user),
            )
        )
        result = await db.execute(query)
        vacancy = result.scalar_one_or_none()
        return vacancy

    @staticmethod
    async def create(
        db: AsyncSession, vacancy_in: FavouriteVacancyCreate, user_id: int
    ) -> FavouriteVacancy:
        # Check if already exists to avoid duplicates
        query = select(FavouriteVacancy).where(
            FavouriteVacancy.vacancy_id == vacancy_in.vacancy_id,
            FavouriteVacancy.user_id == user_id,
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()

        if existing:
            return await FavouriteVacancyService.get_by_id(db, existing.id)

        vacancy = FavouriteVacancy(**vacancy_in.model_dump(), user_id=user_id)
        db.add(vacancy)
        await db.commit()
        return await FavouriteVacancyService.get_by_id(db, vacancy.id)

    @staticmethod
    async def update(
        db: AsyncSession, vacancy: FavouriteVacancy, vacancy_in: FavouriteVacancyCreate
    ) -> FavouriteVacancy:
        update_data = vacancy_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(vacancy, field, value)
        await db.commit()
        return await FavouriteVacancyService.get_by_id(db, vacancy.id)

    @staticmethod
    async def delete(db: AsyncSession, vacancy: FavouriteVacancy) -> None:
        await db.delete(vacancy)
        await db.commit()

    @staticmethod
    async def delete_by_vacancy_id(
        db: AsyncSession, vacancy_id: int, user_id: int
    ) -> bool:
        query = select(FavouriteVacancy).where(
            FavouriteVacancy.vacancy_id == vacancy_id,
            FavouriteVacancy.user_id == user_id,
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
                delete(FavouriteVacancy).where(
                    FavouriteVacancy.vacancy_id == vacancy_id,
                    FavouriteVacancy.user_id == user_id,
                )
            )
            await db.commit()
            return True
        return False
