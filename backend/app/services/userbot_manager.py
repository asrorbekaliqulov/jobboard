"""
Userbot manager (telethon).

Handles:
- Telegram account login flow (send code / verify code) using StringSession.
- Polling monitored channels for new posts.
- Filtering posts by keywords/hashtags.
- AI-parsing posts into vacancies and saving them (status=active) with
  source_type="channel". Skips non-vacancy posts and duplicates.
- Downloading the channel profile photo to use as the vacancy image.

telethon is imported LAZILY and guarded so the app still boots even if the
dependency is not installed yet. Nothing here touches existing tables' schema.
"""
import asyncio
import io
import logging
import random
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.models.userbot import UserbotAccount, UserbotChannel, UserbotStatus
from app.models.vacancy import Vacancy, VacancyStatus, WorkSchedule
from app.services import userbot_parser as parser
from app.services.storage import upload_file

logger = logging.getLogger(__name__)

SYSTEM_USER_TELEGRAM_ID = "userbot_channel_import"

# --- Telegram safety / anti-ban settings ---------------------------------
# Look like a normal, stable desktop client (consistent across sessions so
# Telegram does not flag the account for changing devices every connect).
_DEVICE_MODEL = "ISHKOP Desktop"
_SYSTEM_VERSION = "Windows 10"
_APP_VERSION = "4.16.8 x64"
# Gentle, human-like pacing to stay well within Telegram limits.
MIN_DELAY_BETWEEN_CHANNELS = 4.0   # seconds
MIN_DELAY_BETWEEN_MESSAGES = 1.2   # seconds
# Never flood-wait the worker too long; if Telegram asks for more, skip.
MAX_FLOOD_WAIT_SECONDS = 60

# Maximum vacancies imported from a SINGLE channel within one calendar day
# (UTC). Applies across both the real-time listener and the polling backstop,
# since the count is derived from the vacancies table itself.
DAILY_CHANNEL_LIMIT = 50


async def _human_pause(base: float):
    """Sleep a randomized, human-like amount to avoid rate-limit patterns."""
    await asyncio.sleep(base + random.uniform(0.3, 1.5))


class TelethonNotInstalled(RuntimeError):
    pass


def _import_telethon():
    """Lazy import telethon; raise a friendly error if missing."""
    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession
        from telethon import errors as tg_errors
        return TelegramClient, StringSession, tg_errors
    except Exception as e:  # ImportError or others
        raise TelethonNotInstalled(
            "telethon o'rnatilmagan. requirements.txt ga qo'shildi — "
            "serverda 'docker compose up -d --build' qiling."
        ) from e


async def _new_client(account: UserbotAccount, session_str: str = ""):
    """Create and connect a telethon client for the given account.

    Uses stable device/app identifiers and conservative retry settings so the
    account behaves like a real, long-lived client (reduces ban risk).
    """
    TelegramClient, StringSession, _ = _import_telethon()
    client = TelegramClient(
        StringSession(session_str or ""),
        account.api_id,
        account.api_hash,
        device_model=_DEVICE_MODEL,
        system_version=_SYSTEM_VERSION,
        app_version=_APP_VERSION,
        # telethon auto-sleeps for short flood waits instead of raising
        flood_sleep_threshold=MAX_FLOOD_WAIT_SECONDS,
        connection_retries=3,
        retry_delay=2,
    )
    await client.connect()
    return client


# ----------------------------------------------------------------------------
# Login flow
# ----------------------------------------------------------------------------
async def send_login_code(db: AsyncSession, account: UserbotAccount) -> dict:
    """Request a login code from Telegram. Stores phone_code_hash + session."""
    client = await _new_client(account, account.session_string or "")
    try:
        if await client.is_user_authorized():
            account.status = UserbotStatus.AUTHORIZED.value
            account.session_string = client.session.save()
            account.last_error = None
            await db.commit()
            return {"success": True, "status": account.status,
                    "message": "Akkaunt allaqachon avtorizatsiya qilingan."}

        sent = await client.send_code_request(account.phone)
        account.phone_code_hash = sent.phone_code_hash
        account.session_string = client.session.save()
        account.status = UserbotStatus.CODE_SENT.value
        account.last_error = None
        await db.commit()
        return {"success": True, "status": account.status,
                "message": "Kod yuborildi. Telegram ilovasidagi kodni kiriting."}
    finally:
        await client.disconnect()


async def verify_login_code(
    db: AsyncSession, account: UserbotAccount, code: str, password: Optional[str] = None
) -> dict:
    """Sign in with the received code (and 2FA password if needed)."""
    _, _, tg_errors = _import_telethon()
    client = await _new_client(account, account.session_string or "")
    try:
        try:
            await client.sign_in(
                phone=account.phone,
                code=code.strip(),
                phone_code_hash=account.phone_code_hash,
            )
        except tg_errors.SessionPasswordNeededError:
            if not password:
                account.status = UserbotStatus.CODE_SENT.value
                account.last_error = "2FA parol kerak"
                await db.commit()
                return {"success": False, "status": account.status,
                        "message": "2-bosqichli parol (2FA) kerak. Parolni kiriting."}
            await client.sign_in(password=password)

        account.session_string = client.session.save()
        account.status = UserbotStatus.AUTHORIZED.value
        account.phone_code_hash = None
        account.last_error = None
        account.is_active = True
        await db.commit()
        return {"success": True, "status": account.status,
                "message": "Akkaunt muvaffaqiyatli ulandi."}
    except Exception as e:
        account.status = UserbotStatus.ERROR.value
        account.last_error = str(e)[:500]
        await db.commit()
        return {"success": False, "status": account.status, "message": str(e)}
    finally:
        await client.disconnect()


# ----------------------------------------------------------------------------
# Helpers for saving vacancies
# ----------------------------------------------------------------------------
async def _get_system_user_id(db: AsyncSession) -> int:
    """Return (create if needed) a dedicated system user for channel imports."""
    result = await db.execute(
        select(User).where(User.telegram_id == SYSTEM_USER_TELEGRAM_ID)
    )
    user = result.scalar_one_or_none()
    if user:
        return user.id
    user = User(
        telegram_id=SYSTEM_USER_TELEGRAM_ID,
        username="ishkop_channel_import",
        first_name="ISHKOP",
        last_name="Kanal",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user.id


def _match_keywords(text: str, keywords: Optional[str]) -> bool:
    """True if text matches any keyword/hashtag, or if no keywords are set."""
    if not keywords or not keywords.strip():
        return True
    low = text.lower()
    for kw in keywords.split(","):
        kw = kw.strip().lstrip("#").lower()
        if kw and kw in low:
            return True
    return False


def _build_post_url(channel: UserbotChannel, entity, message_id: int) -> str:
    username = getattr(entity, "username", None) or channel.channel_username
    if username:
        return f"https://t.me/{username}/{message_id}"
    # private channel fallback
    cid = abs(getattr(entity, "id", 0))
    return f"https://t.me/c/{cid}/{message_id}"


async def _save_vacancy(
    db: AsyncSession,
    parsed: dict,
    *,
    system_user_id: int,
    post_url: str,
    channel_title: str,
    image_url: Optional[str],
    contact_telegram: Optional[str],
) -> bool:
    """Create a Vacancy row from parsed data. Returns True if created."""
    # Skip duplicates by source_url
    existing = await db.execute(
        select(Vacancy.id).where(Vacancy.source_url == post_url).limit(1)
    )
    if existing.scalar_one_or_none():
        return False

    profession_id = await parser.resolve_profession_id(db, parsed.get("profession"))
    region_id = await parser.resolve_region_id(db, parsed.get("region"))
    if not profession_id or not region_id:
        logger.warning("Cannot resolve profession/region; skipping vacancy import.")
        return False

    telegram = parsed.get("telegram") or contact_telegram or "ishkop"

    vacancy = Vacancy(
        company_name=parsed["company_name"],
        user_id=system_user_id,
        profession_id=profession_id,
        region_id=region_id,
        status=VacancyStatus.ACTIVE,
        description=parsed["description"],
        work_format=parsed["work_format"],
        work_type=parsed["work_type"],
        work_hours=8,
        phone=(parsed.get("phone") or "")[:20] or "-",
        telegram=telegram[:255],
        schedule=WorkSchedule.S_5_2,
        exp_from=0,
        exp_till=0,
        salary_from=parsed.get("salary_from"),
        salary_till=parsed.get("salary_till"),
        image_url=image_url,
        source_type="channel",
        source_url=post_url,
        source_channel=channel_title[:255] if channel_title else None,
    )
    db.add(vacancy)
    await db.commit()
    return True


async def _ensure_channel_photo(client, entity, channel: UserbotChannel, db: AsyncSession):
    """Download channel profile photo once and store its URL."""
    if channel.channel_photo_url:
        return channel.channel_photo_url
    try:
        buf = io.BytesIO()
        result = await client.download_profile_photo(entity, file=buf)
        if result is None:
            return None
        buf.seek(0)
        if buf.getbuffer().nbytes == 0:
            return None
        url = upload_file(
            buf, "userbot", f"channel_{channel.id}.jpg", content_type="image/jpeg"
        )
        channel.channel_photo_url = url
        await db.commit()
        return url
    except Exception as e:
        logger.warning(f"Channel photo download failed: {e}")
        return None


async def _download_post_image(client, message, channel_id: int) -> Optional[str]:
    """Download an image attached to a channel post and return its stored URL.

    Returns None if the post has no image (e.g. plain text, video, or document
    that is not an image). Videos and non-image files are intentionally ignored.
    """
    try:
        content_type = "image/jpeg"
        ext = "jpg"
        has_image = False

        # Standard Telegram photo
        if getattr(message, "photo", None):
            has_image = True
        else:
            # Image sent as a document (e.g. image/png)
            media = getattr(message, "media", None)
            doc = getattr(media, "document", None) if media else None
            mime = getattr(doc, "mime_type", "") if doc else ""
            if mime and mime.startswith("image/"):
                has_image = True
                content_type = mime
                ext = (mime.split("/")[-1] or "jpg").split(";")[0]

        if not has_image:
            return None

        buf = io.BytesIO()
        result = await client.download_media(message, file=buf)
        if result is None:
            return None
        buf.seek(0)
        if buf.getbuffer().nbytes == 0:
            return None

        return upload_file(
            buf,
            "userbot",
            f"post_{channel_id}_{getattr(message, 'id', 0)}.{ext}",
            content_type=content_type,
        )
    except Exception as e:
        logger.warning(f"Post image download failed: {e}")
        return None


def _channel_url_prefix(channel: UserbotChannel, entity) -> str:
    """The shared prefix of all post URLs for a channel (used for daily counts).

    Mirrors _build_post_url so the prefix matches the source_url stored on
    imported vacancies.
    """
    username = getattr(entity, "username", None) or channel.channel_username
    if username:
        return f"https://t.me/{username}/"
    cid = abs(getattr(entity, "id", 0))
    return f"https://t.me/c/{cid}/"


async def _today_import_count(db: AsyncSession, url_prefix: str) -> int:
    """Count channel vacancies imported TODAY (UTC) for the given URL prefix.

    Reads straight from the vacancies table, so it transparently covers both
    the real-time listener and the polling backstop. Returns 0 on any error so
    importing is never blocked by a counting failure.
    """
    if not url_prefix:
        return 0
    try:
        start_of_day = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        result = await db.execute(
            select(func.count(Vacancy.id)).where(
                Vacancy.source_type == "channel",
                Vacancy.source_url.like(f"{url_prefix}%"),
                Vacancy.created_at >= start_of_day,
            )
        )
        return int(result.scalar_one() or 0)
    except Exception as e:
        logger.warning(f"Daily import count failed for {url_prefix}: {e}")
        return 0


# ----------------------------------------------------------------------------
# Polling
# ----------------------------------------------------------------------------
async def poll_account(db: AsyncSession, account: UserbotAccount, max_per_channel: int = 30) -> int:
    """Poll all active channels of an account; import new vacancies. Returns count."""
    if account.status != UserbotStatus.AUTHORIZED.value or not account.session_string:
        return 0

    client = await _new_client(account, account.session_string)
    imported = 0
    try:
        if not await client.is_user_authorized():
            account.status = UserbotStatus.ERROR.value
            account.last_error = "Sessiya yaroqsiz. Qayta ulang."
            await db.commit()
            return 0

        system_user_id = await _get_system_user_id(db)
        _, _, tg_errors = _import_telethon()
        FloodWaitError = tg_errors.FloodWaitError

        for ch_index, channel in enumerate(list(account.channels)):
            if not channel.is_active:
                continue
            # Space out channels to look human and avoid rate limits
            if ch_index > 0:
                await _human_pause(MIN_DELAY_BETWEEN_CHANNELS)
            try:
                entity = await client.get_entity(channel.channel_identifier)
            except FloodWaitError as fw:
                # Telegram asked us to wait; stop this account's poll politely.
                logger.warning(f"FloodWait {fw.seconds}s on get_entity; pausing account {account.id}.")
                account.last_error = f"FloodWait {fw.seconds}s (kutilmoqda)"
                await db.commit()
                break
            except Exception as e:
                logger.warning(f"get_entity failed for {channel.channel_identifier}: {e}")
                continue

            # Cache channel meta
            if not channel.channel_title:
                channel.channel_title = getattr(entity, "title", None)
            if not channel.channel_username:
                channel.channel_username = getattr(entity, "username", None)
            photo_url = await _ensure_channel_photo(client, entity, channel, db)

            # Daily per-channel cap (shared with the real-time listener).
            url_prefix = _channel_url_prefix(channel, entity)
            remaining_today = DAILY_CHANNEL_LIMIT - await _today_import_count(db, url_prefix)
            if remaining_today <= 0:
                logger.info(
                    "Channel %s reached daily limit (%s); skipping until tomorrow.",
                    channel.id, DAILY_CHANNEL_LIMIT,
                )
                continue

            min_id = channel.last_message_id or 0
            collected = []
            try:
                async for msg in client.iter_messages(entity, limit=max_per_channel):
                    if msg.id <= min_id:
                        break
                    text = msg.message or ""
                    if not text:
                        continue
                    collected.append((msg.id, text, msg))
            except FloodWaitError as fw:
                logger.warning(f"FloodWait {fw.seconds}s on iter_messages; pausing account {account.id}.")
                account.last_error = f"FloodWait {fw.seconds}s (kutilmoqda)"
                await db.commit()
                break
            except Exception as e:
                logger.warning(f"iter_messages failed for {channel.channel_identifier}: {e}")
                continue

            # Process oldest -> newest, pacing AI calls. Advance the pointer only
            # up to the last message we actually handled, so that messages left
            # unprocessed by the daily cap are picked up on a later poll.
            last_done_id = min_id
            for msg_id, text, msg in reversed(collected):
                last_done_id = msg_id
                if not _match_keywords(text, channel.keywords):
                    continue
                parsed = await parser.parse_channel_post(text)
                if not parsed:
                    continue
                # Prefer the post's own image; fall back to the channel photo.
                post_image = await _download_post_image(client, msg, channel.id)
                image_url = post_image or photo_url
                post_url = _build_post_url(channel, entity, msg_id)
                created = await _save_vacancy(
                    db,
                    parsed,
                    system_user_id=system_user_id,
                    post_url=post_url,
                    channel_title=channel.channel_title or channel.channel_identifier,
                    image_url=image_url,
                    contact_telegram=channel.channel_username,
                )
                if created:
                    imported += 1
                    remaining_today -= 1
                    channel.imported_count = (channel.imported_count or 0) + 1
                    if remaining_today <= 0:
                        logger.info(
                            "Channel %s hit daily limit (%s) during poll.",
                            channel.id, DAILY_CHANNEL_LIMIT,
                        )
                        break
                await _human_pause(MIN_DELAY_BETWEEN_MESSAGES)

            if last_done_id > (channel.last_message_id or 0):
                channel.last_message_id = last_done_id
            await db.commit()

        account.last_error = None
        await db.commit()
    except TelethonNotInstalled:
        raise
    except Exception as e:
        logger.error(f"poll_account error (account {account.id}): {e}")
        account.last_error = str(e)[:500]
        await db.commit()
    finally:
        await client.disconnect()

    return imported


async def poll_all_accounts(db: AsyncSession) -> int:
    """Poll every active, authorized account. Returns total imported."""
    result = await db.execute(
        select(UserbotAccount).where(
            UserbotAccount.is_active.is_(True),
            UserbotAccount.status == UserbotStatus.AUTHORIZED.value,
        )
    )
    accounts = result.scalars().all()
    total = 0
    for idx, account in enumerate(accounts):
        # Space out accounts so multiple userbots don't hammer Telegram at once
        if idx > 0:
            await _human_pause(MIN_DELAY_BETWEEN_CHANNELS)
        try:
            total += await poll_account(db, account)
        except TelethonNotInstalled:
            logger.warning("telethon not installed — skipping userbot polling.")
            break
        except Exception as e:
            logger.error(f"poll_all_accounts: account {account.id} failed: {e}")
    return total
