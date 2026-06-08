from fastapi import FastAPI, Request
from fastapi_babel import _, BabelMiddleware
from fastapi.staticfiles import StaticFiles
from aiogram import types
import time
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

@app.on_event("startup")
async def on_startup():
    # Configure the webhook on Telegram's servers only if an https URL is provided
    if settings.WEBHOOK_URL and settings.WEBHOOK_URL.startswith("https://"):
        try:
            await bot.set_webhook(
                url=settings.WEBHOOK_URL,
                allowed_updates=dp.resolve_used_update_types(),
                drop_pending_updates=True
            )
            webhook_info = await bot.get_webhook_info()
            logger.info(f"Webhook info: {webhook_info}")
        except Exception as e:
            logger.warning(f"Skipping webhook setup (failed): {e}")
    else:
        logger.info("WEBHOOK_URL not HTTPS or not set — skipping webhook setup on startup.")

    await i18n_middleware.core.startup()
    
    # Start the scheduler
    start_scheduler()

@app.on_event("shutdown")
async def on_shutdown():
    # Only try to delete webhook if it was set to an HTTPS URL
    if settings.WEBHOOK_URL and settings.WEBHOOK_URL.startswith("https://"):
        try:
            await bot.delete_webhook()
        except Exception:
            logger.warning("Failed to delete webhook on shutdown — ignoring")
    await bot.session.close()
    
    # Stop the scheduler
    stop_scheduler()

@app.post("/webhook")
async def bot_webhook(update: dict):
    """
    Endpoint for Telegram to push updates
    """
    logger.info(f"Update received")
    telegram_update = types.Update(**update)
    await dp.feed_update(bot, telegram_update)

@app.get("/health")
async def health_check():
    return {"status": _("ok")}