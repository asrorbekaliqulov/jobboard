from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.vacancy import Vacancy
from app.models.resume import Resume
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, redis: Redis):
        self.redis = redis

    async def register_view(self, item_type: str, item_id: int, user_id: int):
        """
        Registers a view for a vacancy or resume.
        item_type: 'vacancy' or 'resume'
        """
        session_key = f"view_session:{item_type}:{item_id}:{user_id}"
        counter_key = f"view_count:{item_type}:{item_id}"
        modified_set_key = f"view_modified:{item_type}"

        # check if session exists
        if await self.redis.exists(session_key):
            return

        # set session with 15 min expiry
        await self.redis.setex(session_key, 900, "1")

        # increment counter
        await self.redis.incr(counter_key)

        # add to modified set
        await self.redis.sadd(modified_set_key, item_id)

    async def sync_views(self, db: AsyncSession):
        """
        Syncs views from Redis to DB.
        """
        for item_type, Model in [('vacancy', Vacancy), ('resume', Resume)]:
            modified_set_key = f"view_modified:{item_type}"
            
            # Get all modified IDs
            modified_ids = await self.redis.smembers(modified_set_key)
            if not modified_ids:
                continue

            for item_id_bytes in modified_ids:
                item_id = int(item_id_bytes)
                counter_key = f"view_count:{item_type}:{item_id}"
                
                # Get and reset counter atomically
                count = await self.redis.getdel(counter_key)
                if not count:
                    continue
                
                count = int(count)
                
                # Update DB
                try:
                    item = await db.get(Model, item_id)
                    if item:
                        item.viewed_count += count
                        db.add(item)
                except Exception as e:
                    logger.error(f"Error syncing view for {item_type} {item_id}: {e}")

            await db.commit()
            
            # Remove processed IDs from set
            # Note: This is slightly racy if new views come in exactly now, but acceptable for view counts.
            # A strict approach would be to remove only the specific IDs we processed.
            if modified_ids:
                await self.redis.srem(modified_set_key, *modified_ids)
