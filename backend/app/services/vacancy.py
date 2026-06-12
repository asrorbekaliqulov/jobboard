from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from aiogram.exceptions import TelegramAPIError
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.profession import Profession
from app.models.channel_message import ChannelMessage, ChannelMessageEntity
from app.schemas.vacancy import VacancyCreate, VacancyUpdate
from typing import List, Optional
from app.core.config import settings
from app.bot.factory import bot
import logging

logger = logging.getLogger(__name__)

class VacancyService:
    @staticmethod
    async def _get_by_id_with_relations(db: AsyncSession, vacancy_id: int) -> Optional[Vacancy]:
        query = select(Vacancy).where(Vacancy.id == vacancy_id).options(
            selectinload(Vacancy.profession),
            selectinload(Vacancy.region),
            selectinload(Vacancy.user)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def _publish_to_channel(db: AsyncSession, vacancy: Vacancy) -> None:
        if not settings.TELEGRAM_CHANNEL_IDS:
            return

        text = vacancy.format_channel_message()
        any_published = False
        for channel_id in settings.TELEGRAM_CHANNEL_IDS:
            try:
                sent_message = await bot.send_message(
                    chat_id=channel_id,
                    text=text,
                    parse_mode="Markdown",
                )
            except TelegramAPIError:
                logger.exception(
                    "Failed to publish vacancy %s to channel %s", vacancy.id, channel_id
                )
                continue

            db.add(
                ChannelMessage(
                    entity_type=ChannelMessageEntity.VACANCY,
                    entity_id=vacancy.id,
                    channel_id=str(channel_id),
                    message_id=sent_message.message_id,
                )
            )
            any_published = True

        if any_published:
            try:
                await db.commit()
            except Exception:
                logger.exception(
                    "Failed to persist channel messages for vacancy %s", vacancy.id
                )
                await db.rollback()

    @staticmethod
    async def get_all(
        db: AsyncSession, 
        skip: int = 0, 
        limit: int = 100,
        user_id: Optional[int] = None,
        profession_id: Optional[int] = None,
        profession_ids: Optional[List[int]] = None,
        region_id: Optional[int] = None,
        status: Optional[VacancyStatus] = None,
        search: Optional[str] = None,
        work_format: Optional[str] = None,
        work_type: Optional[str] = None,
        salary_from: Optional[int] = None,
        salary_till: Optional[int] = None,
        exp_from: Optional[int] = None,
        exp_till: Optional[int] = None
    ) -> List[Vacancy]:
        query = select(Vacancy).options(
            selectinload(Vacancy.profession),
            selectinload(Vacancy.region),
            selectinload(Vacancy.user)
        )
        
        if user_id:
            query = query.where(Vacancy.user_id == user_id)
        if profession_id:
            query = query.where(Vacancy.profession_id == profession_id)
        elif profession_ids is not None:
            if profession_ids:
                query = query.where(Vacancy.profession_id.in_(profession_ids))
            else:
                # Empty list means no professions in category — return nothing
                query = query.where(Vacancy.id == -1)
        if region_id:
            query = query.where(Vacancy.region_id == region_id)
        if status:
            query = query.where(Vacancy.status == status)
        elif not user_id: # By default only show ACTIVE vacancies for public
            query = query.where(Vacancy.status == VacancyStatus.ACTIVE)
        
        # Work format filter
        if work_format:
            query = query.where(Vacancy.work_format == work_format)
        
        # Work type filter
        if work_type:
            query = query.where(Vacancy.work_type == work_type)
        
        # Salary range filter
        if salary_from is not None:
            query = query.where(
                or_(
                    Vacancy.salary_from >= salary_from,
                    Vacancy.salary_till >= salary_from
                )
            )
        if salary_till is not None:
            query = query.where(
                or_(
                    Vacancy.salary_from <= salary_till,
                    Vacancy.salary_till <= salary_till
                )
            )
        
        # Experience range filter
        if exp_from is not None:
            query = query.where(Vacancy.exp_from >= exp_from)
        if exp_till is not None:
            query = query.where(Vacancy.exp_till <= exp_till)
            
        if search:
            search_filter = f"%{search}%"
            query = query.join(Vacancy.profession)
            query = query.where(
                or_(
                    Vacancy.company_name.ilike(search_filter),
                    Vacancy.description.ilike(search_filter),
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )
            
        result = await db.execute(query.offset(skip).limit(limit).order_by(Vacancy.created_at.desc()))
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: Optional[int] = None,
        profession_id: Optional[int] = None,
        profession_ids: Optional[List[int]] = None,
        region_id: Optional[int] = None,
        status: Optional[VacancyStatus] = None,
        search: Optional[str] = None,
        work_format: Optional[str] = None,
        work_type: Optional[str] = None,
        salary_from: Optional[int] = None,
        salary_till: Optional[int] = None,
        exp_from: Optional[int] = None,
        exp_till: Optional[int] = None
    ) -> int:
        query = select(func.count(Vacancy.id))
        
        if user_id:
            query = query.where(Vacancy.user_id == user_id)
        if profession_id:
            query = query.where(Vacancy.profession_id == profession_id)
        elif profession_ids is not None:
            if profession_ids:
                query = query.where(Vacancy.profession_id.in_(profession_ids))
            else:
                query = query.where(Vacancy.id == -1)
        if region_id:
            query = query.where(Vacancy.region_id == region_id)
        if status:
            query = query.where(Vacancy.status == status)
        elif not user_id:
            query = query.where(Vacancy.status == VacancyStatus.ACTIVE)
        
        if work_format:
            query = query.where(Vacancy.work_format == work_format)
        if work_type:
            query = query.where(Vacancy.work_type == work_type)
        if salary_from is not None:
            query = query.where(
                or_(
                    Vacancy.salary_from >= salary_from,
                    Vacancy.salary_till >= salary_from
                )
            )
        if salary_till is not None:
            query = query.where(
                or_(
                    Vacancy.salary_from <= salary_till,
                    Vacancy.salary_till <= salary_till
                )
            )
        if exp_from is not None:
            query = query.where(Vacancy.exp_from >= exp_from)
        if exp_till is not None:
            query = query.where(Vacancy.exp_till <= exp_till)
            
        if search:
            search_filter = f"%{search}%"
            query = query.join(Vacancy.profession)
            query = query.where(
                or_(
                    Vacancy.company_name.ilike(search_filter),
                    Vacancy.description.ilike(search_filter),
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )
            
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, vacancy_id: int) -> Optional[Vacancy]:
        query = select(Vacancy).where(Vacancy.id == vacancy_id).options(
            selectinload(Vacancy.profession),
            selectinload(Vacancy.region),
            selectinload(Vacancy.user)
        )
        result = await db.execute(query)
        vacancy = result.scalar_one_or_none()
        if vacancy:
            # Increment view count
            vacancy.viewed_count += 1
            await db.commit()
            # Re-fetch to ensure relationships are loaded and timestamp fields are refreshed
            result = await db.execute(query)
            vacancy = result.scalar_one_or_none()
        return vacancy

    @staticmethod
    async def create(db: AsyncSession, vacancy_in: VacancyCreate, user_id: int) -> Vacancy:
        vacancy = Vacancy(**vacancy_in.model_dump(), user_id=user_id)
        db.add(vacancy)
        await db.commit()

        created_vacancy = await VacancyService._get_by_id_with_relations(db, vacancy.id)
        if created_vacancy:
            await VacancyService._publish_to_channel(db, created_vacancy)
            # Re-fetch after publish so response serialization has a fresh object
            created_vacancy = await VacancyService._get_by_id_with_relations(db, vacancy.id)
        return created_vacancy or vacancy

    @staticmethod
    async def update(db: AsyncSession, vacancy: Vacancy, vacancy_in: VacancyUpdate) -> Vacancy:
        update_data = vacancy_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(vacancy, field, value)
        await db.commit()
        return await VacancyService.get_by_id(db, vacancy.id)

    @staticmethod
    async def delete(db: AsyncSession, vacancy: Vacancy) -> None:
        await db.delete(vacancy)
        await db.commit()
