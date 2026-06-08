import logging
from typing import List, Optional

from aiogram.exceptions import TelegramAPIError
from app.bot.factory import bot
from app.core.config import settings
from app.models.channel_message import ChannelMessage, ChannelMessageEntity
from app.models.resume import Resume, ResumeStatus
from app.schemas.resume import ResumeCreate, ResumeUpdate
from app.services.storage import delete_file
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


class ResumeService:
    @staticmethod
    async def _get_by_id_with_relations(
        db: AsyncSession, resume_id: int
    ) -> Optional[Resume]:
        query = (
            select(Resume)
            .where(Resume.id == resume_id)
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
                selectinload(Resume.user),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def _publish_to_channel(db: AsyncSession, resume: Resume) -> None:
        if not settings.TELEGRAM_CHANNEL_IDS:
            return

        text = resume.format_channel_message()
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
                    "Failed to publish resume %s to channel %s", resume.id, channel_id
                )
                continue

            db.add(
                ChannelMessage(
                    entity_type=ChannelMessageEntity.RESUME,
                    entity_id=resume.id,
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
                    "Failed to persist channel messages for resume %s", resume.id
                )
                await db.rollback()

    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[int] = None,
        profession_id: Optional[int] = None,
        region_id: Optional[int] = None,
        gender: Optional[str] = None,
        status: Optional[ResumeStatus] = None,
        search: Optional[str] = None,
        age_from: Optional[int] = None,
        age_till: Optional[int] = None,
    ) -> List[Resume]:
        query = select(Resume).options(
            selectinload(Resume.profession),
            selectinload(Resume.region),
            selectinload(Resume.user),
        )

        if user_id:
            query = query.where(Resume.user_id == user_id)
        if profession_id:
            query = query.where(Resume.profession_id == profession_id)
        if region_id:
            query = query.where(Resume.region_id == region_id)
        if gender and gender != "any" and gender != "all":
            query = query.where(Resume.gender == gender)
        if status:
            query = query.where(Resume.status == status)
        elif not user_id:  # By default only show ACTIVE resumes for public
            query = query.where(Resume.status == ResumeStatus.ACTIVE)
        if age_from:
            query = query.where(Resume.age >= age_from)
        if age_till:
            query = query.where(Resume.age <= age_till)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Resume.first_name.ilike(search_filter),
                    Resume.last_name.ilike(search_filter),
                    Resume.description.ilike(search_filter),
                )
            )

        result = await db.execute(
            query.offset(skip).limit(limit).order_by(Resume.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def count(
        db: AsyncSession,
        user_id: Optional[int] = None,
        profession_id: Optional[int] = None,
        region_id: Optional[int] = None,
        gender: Optional[str] = None,
        status: Optional[ResumeStatus] = None,
        search: Optional[str] = None,
        age_from: Optional[int] = None,
        age_till: Optional[int] = None,
    ) -> int:
        query = select(func.count(Resume.id))

        if user_id:
            query = query.where(Resume.user_id == user_id)
        if profession_id:
            query = query.where(Resume.profession_id == profession_id)
        if region_id:
            query = query.where(Resume.region_id == region_id)
        if gender and gender != "any" and gender != "all":
            query = query.where(Resume.gender == gender)
        if status:
            query = query.where(Resume.status == status)
        elif not user_id:
            query = query.where(Resume.status == ResumeStatus.ACTIVE)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Resume.first_name.ilike(search_filter),
                    Resume.last_name.ilike(search_filter),
                    Resume.description.ilike(search_filter),
                )
            )
        if age_from:
            query = query.where(Resume.age >= age_from)
        if age_till:
            query = query.where(Resume.age <= age_till)
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, resume_id: int) -> Optional[Resume]:
        query = (
            select(Resume)
            .where(Resume.id == resume_id)
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
                selectinload(Resume.user),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, resume_in: ResumeCreate, user_id: int) -> Resume:
        resume = Resume(**resume_in.model_dump(), user_id=user_id)
        db.add(resume)
        await db.commit()

        created_resume = await ResumeService._get_by_id_with_relations(db, resume.id)
        if created_resume:
            await ResumeService._publish_to_channel(db, created_resume)
            # Re-fetch after publish so response serialization has a fresh object
            created_resume = await ResumeService._get_by_id_with_relations(
                db, resume.id
            )
        return created_resume or resume

    @staticmethod
    async def update(
        db: AsyncSession, resume: Resume, resume_in: ResumeUpdate
    ) -> Resume:
        update_data = resume_in.model_dump(exclude_unset=True)

        # Delete old files from storage when portfolio/video is removed or replaced
        for field in ("portfolio", "video"):
            if field in update_data:
                old_url = getattr(resume, field)
                new_url = update_data[field] or ""
                if old_url and old_url != new_url:
                    delete_file(old_url)

        for field, value in update_data.items():
            setattr(resume, field, value)
        await db.commit()
        return await ResumeService.get_by_id(db, resume.id)

    @staticmethod
    async def delete(db: AsyncSession, resume: Resume) -> None:
        # Delete portfolio and video files from storage
        if resume.portfolio:
            delete_file(resume.portfolio)
        if resume.video:
            delete_file(resume.video)

        await db.delete(resume)
        await db.commit()
