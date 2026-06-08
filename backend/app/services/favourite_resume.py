from sqlalchemy.exc import MultipleResultsFound, NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, delete, exists
from sqlalchemy.orm import selectinload
from app.models.resume import Resume
from app.models.favourite import FavouriteResume
from app.schemas.favourite import FavouriteResumeCreate
from typing import List, Optional

class FavouriteResumeService:
    @staticmethod
    async def get_all(
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        user_id: Optional[int] = None,
    ) -> List[FavouriteResume]:
        query = select(FavouriteResume).options(
            selectinload(FavouriteResume.resume).selectinload(Resume.profession),
            selectinload(FavouriteResume.resume).selectinload(Resume.region),
            selectinload(FavouriteResume.resume).selectinload(Resume.user),
        )
        
        if user_id:
            query = query.where(FavouriteResume.user_id == user_id)
            
        result = await db.execute(query.offset(skip).limit(limit).order_by(FavouriteResume.created_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: Optional[int] = None,
    ) -> int:
        query = select(func.count(FavouriteResume.id))
        
        if user_id:
            query = query.where(FavouriteResume.user_id == user_id)
            
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, resume_id: int) -> Optional[FavouriteResume]:
        query = select(FavouriteResume).where(FavouriteResume.id == resume_id).options(
            selectinload(FavouriteResume.resume).selectinload(Resume.profession),
            selectinload(FavouriteResume.resume).selectinload(Resume.region),
            selectinload(FavouriteResume.resume).selectinload(Resume.user),
        )
        result = await db.execute(query)
        resume = result.scalar_one_or_none()
        return resume

    @staticmethod
    async def create(db: AsyncSession, resume_in: FavouriteResumeCreate, user_id: int) -> FavouriteResume:
        # Check if already exists to avoid duplicates
        query = select(FavouriteResume).where(
            FavouriteResume.resume_id == resume_in.resume_id,
            FavouriteResume.user_id == user_id
        ).options(
            selectinload(FavouriteResume.resume).selectinload(Resume.profession),
            selectinload(FavouriteResume.resume).selectinload(Resume.region),
            selectinload(FavouriteResume.resume).selectinload(Resume.user),
        )
        result = await db.execute(query)
        existing = result.scalar_one_or_none()
        
        if existing:
            return existing
            
        resume = FavouriteResume(**resume_in.model_dump(), user_id=user_id)
        db.add(resume)
        await db.commit()
        return await FavouriteResumeService.get_by_id(db, resume.id)

    @staticmethod
    async def update(db: AsyncSession, resume: FavouriteResume, resume_in: FavouriteResumeCreate) -> FavouriteResume:
        update_data = resume_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(resume, field, value)
        await db.commit()
        return await FavouriteResumeService.get_by_id(db, resume.id)

    @staticmethod
    async def delete(db: AsyncSession, resume: FavouriteResume) -> None:
        await db.delete(resume)
        await db.commit()

    @staticmethod
    async def delete_by_resume_id(db: AsyncSession, resume_id: int, user_id: int) -> bool:
        query = select(FavouriteResume).where(
            FavouriteResume.resume_id == resume_id,
            FavouriteResume.user_id == user_id
        )
        result = await db.execute(query)
        try:
            favourite = result.scalar_one_or_none()
            if favourite:
                await db.delete(favourite)
                await db.commit()
                return True
        except MultipleResultsFound:
            query = delete(FavouriteResume).where(
                FavouriteResume.resume_id == resume_id,
                FavouriteResume.user_id == user_id
            )
            await db.execute(query)
            await db.commit()
            return True
        except NoResultFound:
            pass

        return False
