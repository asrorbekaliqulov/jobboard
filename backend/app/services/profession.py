from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.profession import Profession
from app.schemas.profession import ProfessionCreate, ProfessionUpdate
from typing import List, Optional

class ProfessionService:
    @staticmethod
    async def get_all(db: AsyncSession, only_active: bool | None = None, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Profession]:
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
        result = await db.execute(query.offset(skip).limit(limit).order_by(Profession.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def count(db: AsyncSession, only_active: bool | None = None, search: Optional[str] = None) -> int:
        from sqlalchemy import func
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
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, profession_id: int) -> Optional[Profession]:
        result = await db.execute(select(Profession).where(Profession.id == profession_id))
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
