from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.redis import RedisStorage
from redis.asyncio import Redis
from app.core.config import settings
from app.core.i18n import i18n_middleware
from app.bot.handlers.start import router as start_router


bot = Bot(token=settings.BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))

# Use RedisStorage for persistence and multi-replica support
storage = RedisStorage(redis=Redis.from_url(settings.REDIS_URL))
dp = Dispatcher(storage=storage)
i18n_middleware.setup(dp)
dp.include_router(start_router)