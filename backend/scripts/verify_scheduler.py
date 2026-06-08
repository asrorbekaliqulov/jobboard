import asyncio
import logging
import sys
import os

# Add parent directory to path to allow importing app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings
from app.core.scheduler import run_analytics_sync
from app.core.database import async_session_maker
from redis.asyncio import Redis
from app.models.vacancy import Vacancy
from sqlalchemy import select

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify():
    # 1. Setup
    logger.info(f"Connecting to Redis at {settings.REDIS_URL}")
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    
    vacancy_id = None
    initial_views = 0
    
    async with async_session_maker() as db:
        # Find a vacancy to test with
        result = await db.execute(select(Vacancy).limit(1))
        vacancy = result.scalar_one_or_none()
        
        if not vacancy:
            logger.error("No vacancies found in DB to test with. Please create a vacancy first.")
            await redis.close()
            return

        vacancy_id = vacancy.id
        initial_views = vacancy.viewed_count or 0
        logger.info(f"Test Vacancy ID: {vacancy_id}, Initial Views: {initial_views}")

    # 2. Simulate Views in Redis
    # Register 5 views
    logger.info(f"Simulating 5 views in Redis for vacancy {vacancy_id}...")
    counter_key = f"view_count:vacancy:{vacancy_id}"
    modified_set_key = "view_modified:vacancy"
    
    # We add to the existing count if any, or set it.
    # To be precise, let's just INCRBY 5? Or set.
    # AnalyticsService expects a number.
    await redis.incrby(counter_key, 5)
    await redis.sadd(modified_set_key, vacancy_id)
    
    # Verify Redis state
    count_in_redis = await redis.get(counter_key)
    logger.info(f"Count in Redis: {count_in_redis}")
        
    await redis.close()

    # 3. Run Scheduler Job
    logger.info("Running run_analytics_sync manually...")
    try:
        await run_analytics_sync()
    except Exception as e:
        logger.error(f"Scheduler job failed: {e}", exc_info=True)
        return

    # 4. Verify DB Update
    async with async_session_maker() as db:
        result = await db.execute(select(Vacancy).where(Vacancy.id == vacancy_id))
        updated_vacancy = result.scalar_one()
        new_views = updated_vacancy.viewed_count or 0
        logger.info(f"Updated Views in DB: {new_views}")
        
        # We expect initial + 5 + any previous count in redis (which we incremented)
        # But for test simplicity, if we blindly INCRBY 5, the new view count should be >= initial + 5.
        if new_views >= initial_views + 5:
            logger.info("SUCCESS: Views updated correctly.")
        else:
            logger.error(f"FAILURE: Expected at least {initial_views + 5}, got {new_views}")

    # 5. Verify Redis Cleanup
    redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    count_after = await redis.get(counter_key)
    if not count_after:
        logger.info("SUCCESS: Redis counter cleaned up.")
    else:
        logger.info(f"Redis counter state: {count_after} (might remain if new views came in, but expected empty for test)")
    
    await redis.close()

if __name__ == "__main__":
    if os.path.exists(".env"):
        from dotenv import load_dotenv
        load_dotenv()
    else:
        logger.warning("No .env file found in current directory.")
        
    asyncio.run(verify())
