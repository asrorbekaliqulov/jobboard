from fastapi import FastAPI, Request
from fastapi_babel import _, BabelMiddleware
from fastapi.staticfiles import StaticFiles
from aiogram import types
import asyncio
import time
import os
from app.core.config import settings
from app.bot.factory import bot, dp
from app.api.v1.api import api_router
from app.core.logging_config import setup_logging, logger
from app.core.i18n import babel, babel_configs, i18n_middleware
from app.core.scheduler import start_scheduler, stop_scheduler

# Initialize logging
setup_logging()

app = FastAPI(title="Job Hunter TMA Backend")
app.add_middleware(BabelMiddleware, babel_configs=babel_configs)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    logger.info(
        f"RID={request.scope.get('request_id', 'N/A')} "
        f"method={request.method} path={request.url.path} "
        f"status={response.status_code} duration={formatted_process_time}ms"
    )
    return response

app.include_router(api_router, prefix="/api/v1")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Store polling task reference
_polling_task: asyncio.Task | None = None

@app.on_event("startup")
async def on_startup():
    global _polling_task

    if settings.use_webhook:
        # Webhook mode: set webhook on Telegram servers
        try:
            await bot.set_webhook(
                url=settings.WEBHOOK_URL,
                allowed_updates=dp.resolve_used_update_types(),
                drop_pending_updates=True
            )
            webhook_info = await bot.get_webhook_info()
            logger.info(f"Webhook mode active. Webhook info: {webhook_info}")
        except Exception as e:
            logger.warning(f"Skipping webhook setup (failed): {e}")
    else:
        # Polling mode: start polling in background task
        logger.info("WEBHOOK_URL not set or not HTTPS — starting bot in POLLING mode.")
        try:
            # Delete any existing webhook first
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception:
            pass
        _polling_task = asyncio.create_task(_start_polling())

    await i18n_middleware.core.startup()
    
    # Start the scheduler
    start_scheduler()

    # Start real-time userbot channel listeners (guarded; safe if telethon missing)
    try:
        from app.services.userbot_listener import start_all_listeners
        await start_all_listeners()
    except Exception as e:
        logger.warning(f"Userbot real-time listener startup skipped: {e}")


async def _start_polling():
    """Run the dispatcher polling in background."""
    logger.info("Bot polling started...")
    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    except asyncio.CancelledError:
        logger.info("Bot polling cancelled.")
    except Exception as e:
        logger.error(f"Bot polling error: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    global _polling_task

    if settings.use_webhook:
        # Only try to delete webhook if it was set
        try:
            await bot.delete_webhook()
        except Exception:
            logger.warning("Failed to delete webhook on shutdown — ignoring")
    else:
        # Stop polling
        if _polling_task and not _polling_task.done():
            _polling_task.cancel()
            try:
                await _polling_task
            except asyncio.CancelledError:
                pass
        await dp.stop_polling()
        logger.info("Bot polling stopped.")

    await bot.session.close()
    
    # Stop the scheduler
    stop_scheduler()

    # Stop real-time userbot listeners
    try:
        from app.services.userbot_listener import stop_all_listeners
        await stop_all_listeners()
    except Exception:
        pass

@app.post("/webhook")
async def bot_webhook(update: dict):
    """
    Endpoint for Telegram to push updates (only used in webhook mode)
    """
    logger.info(f"Update received")
    telegram_update = types.Update(**update)
    await dp.feed_update(bot, telegram_update)

@app.get("/health")
async def health_check():
    return {"status": _("ok")}