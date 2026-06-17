from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage
from app.core.config import settings
from app.core.i18n import i18n_middleware
from app.bot.handlers.start import router as start_router
from app.bot.handlers.ai_search import router as ai_search_router


bot = Bot(token=settings.BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

# Use RedisStorage if Redis is configured, otherwise fall back to MemoryStorage
if settings.use_redis:
    from aiogram.fsm.storage.redis import RedisStorage
    from redis.asyncio import Redis
    storage = RedisStorage(redis=Redis.from_url(settings.REDIS_URL))
else:
    storage = MemoryStorage()

dp = Dispatcher(storage=storage)
i18n_middleware.setup(dp)
dp.include_router(start_router)
dp.include_router(ai_search_router)  # AI text + voice search handler