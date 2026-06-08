import logging
import random
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from redis.asyncio import Redis
from sqlalchemy import select
from app.core.config import settings
from app.core.database import async_session_maker
from app.services.analytics import AnalyticsService
from app.models.resume import Resume
from app.models.vacancy import Vacancy
from app.models.daily_job_seeker import DailyJobSeeker

logger = logging.getLogger(__name__)

# Initialize the scheduler
scheduler = AsyncIOScheduler()

async def run_analytics_sync():
    """
    Scheduled job to sync views from Redis to PostgreSQL.
    Runs every 10 minutes (configurable).
    """
    logger.info("Starting analytics sync job...")
    
    # Create a dedicated Redis client for the job
    # We use decode_responses=True for easier string handling, 
    # though AnalyticsService should handle bytes/strings gracefully via int() conversions.
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async with async_session_maker() as db:
        service = AnalyticsService(redis)
        try:
            await service.sync_views(db)
            logger.info("Analytics sync job completed successfully.")
        except Exception as e:
            logger.error(f"Analytics sync job failed: {e}", exc_info=True)
        finally:
            await redis.close()

async def run_notification_job():
    """
    Scheduled job to send notifications for new matching vacancies/resumes.
    Runs every 5 minutes (configurable).
    """
    logger.info("Starting notification job...")
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    async with async_session_maker() as db:
        from app.bot.factory import bot 
        from app.services.notification import NotificationService
        
        notification_service = NotificationService(bot, redis)
        try:
            await notification_service.run(db)
            logger.info("Notification job completed successfully.")
        except Exception as e:
            logger.error(f"Notification job failed: {e}", exc_info=True)
        finally:
            await redis.close()

async def run_daily_views_boost():
    """
    Scheduled job to increase viewed_count for resumes and vacancies daily.
    Each row gets a random increment from 1 to 10.
    """
    logger.info("Starting daily views boost job...")

    async with async_session_maker() as db:
        try:
            resume_result = await db.execute(select(Resume))
            resumes = resume_result.scalars().all()

            vacancy_result = await db.execute(select(Vacancy))
            vacancies = vacancy_result.scalars().all()

            for resume in resumes:
                resume.viewed_count = (resume.viewed_count or 0) + random.randint(1, 10)

            for vacancy in vacancies:
                vacancy.viewed_count = (vacancy.viewed_count or 0) + random.randint(1, 10)

            await db.commit()
            logger.info(
                "Daily views boost completed: updated %s resumes and %s vacancies.",
                len(resumes),
                len(vacancies),
            )
        except Exception as e:
            await db.rollback()
            logger.error(f"Daily views boost failed: {e}", exc_info=True)

MAX_VIEWS_BOOST = 7000


async def run_views_boost_3h():
    """
    Scheduled job: every 3 hours, increment viewed_count by a random 100–200
    for each vacancy, resume, and daily job seeker that hasn't yet reached
    MAX_VIEWS_BOOST (7000). Records already at or above the cap are skipped.
    """
    logger.info("Starting 3-hour views boost job...")

    async with async_session_maker() as db:
        try:
            vacancies = (await db.execute(select(Vacancy))).scalars().all()
            resumes = (await db.execute(select(Resume))).scalars().all()
            daily = (await db.execute(select(DailyJobSeeker))).scalars().all()

            updated = 0
            for record in (*vacancies, *resumes, *daily):
                current = record.viewed_count or 0
                if current >= MAX_VIEWS_BOOST:
                    continue
                increment = random.randint(100, 200)
                record.viewed_count = min(current + increment, MAX_VIEWS_BOOST)
                updated += 1

            await db.commit()
            logger.info(
                "3-hour views boost completed: %s records updated (cap=%s).",
                updated,
                MAX_VIEWS_BOOST,
            )
        except Exception as e:
            await db.rollback()
            logger.error(f"3-hour views boost failed: {e}", exc_info=True)


def start_scheduler():
    """
    Starts the scheduler and adds the jobs.
    """
    if not scheduler.running:
        # Analytics Sync (every 10 min)
        scheduler.add_job(
            run_analytics_sync,
            'interval',
            minutes=10,
            id='analytics_sync',
            replace_existing=True
        )

        # Notification Service (every 5 min)
        scheduler.add_job(
            run_notification_job,
            'interval',
            minutes=5,
            id='notification_job',
            replace_existing=True
        )

        # Daily random views boost (once a day at 00:00)
        scheduler.add_job(
            run_daily_views_boost,
            'cron',
            hour=0,
            minute=0,
            id='daily_views_boost',
            replace_existing=True
        )

        # Every-3-hours views boost (increments 100–200 per record, capped at 7000)
        scheduler.add_job(
            run_views_boost_3h,
            'interval',
            hours=3,
            id='views_boost_3h',
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("Scheduler started with recurring jobs.")

def stop_scheduler():
    """
    Stops the scheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped.")
