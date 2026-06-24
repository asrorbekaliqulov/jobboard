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
import io
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.models.userbot import UserbotAccount, UserbotChannel, UserbotStatus
from app.models.vacancy import Vacancy, VacancyStatus, WorkSchedule
from app.services import userbot_parser as parser
from app.services.storage import upload_file

logger = logging.getLogger(__name__)

SYSTEM_USER_TELEGRAM_ID = "userbot_channel_import"


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
    """Create and connect a telethon client for the given account."""
    TelegramClient, StringSession, _ = _import_telethon()
    client = TelegramClient(
        StringSession(session_str or ""), account.api_id, account.api_hash
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

        for channel in list(account.channels):
            if not channel.is_active:
                continue
            try:
                entity = await client.get_entity(channel.channel_identifier)
            except Exception as e:
                logger.warning(f"get_entity failed for {channel.channel_identifier}: {e}")
                continue

            # Cache channel meta
            if not channel.channel_title:
                channel.channel_title = getattr(entity, "title", None)
            if not channel.channel_username:
                channel.channel_username = getattr(entity, "username", None)
            photo_url = await _ensure_channel_photo(client, entity, channel, db)

            min_id = channel.last_message_id or 0
            new_max_id = min_id
            collected = []
            try:
                async for msg in client.iter_messages(entity, limit=max_per_channel):
                    if msg.id <= min_id:
                        break
                    text = msg.message or ""
                    if not text:
                        continue
                    collected.append((msg.id, text))
                    if msg.id > new_max_id:
                        new_max_id = msg.id
            except Exception as e:
                logger.warning(f"iter_messages failed for {channel.channel_identifier}: {e}")
                continue

            # Process oldest -> newest
            for msg_id, text in reversed(collected):
                if not _match_keywords(text, channel.keywords):
                    continue
                parsed = await parser.parse_channel_post(text)
                if not parsed:
                    continue
                post_url = _build_post_url(channel, entity, msg_id)
                created = await _save_vacancy(
                    db,
                    parsed,
                    system_user_id=system_user_id,
                    post_url=post_url,
                    channel_title=channel.channel_title or channel.channel_identifier,
                    image_url=photo_url,
                    contact_telegram=channel.channel_username,
                )
                if created:
                    imported += 1
                    channel.imported_count = (channel.imported_count or 0) + 1

            if new_max_id > (channel.last_message_id or 0):
                channel.last_message_id = new_max_id
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
    for account in accounts:
        try:
            total += await poll_account(db, account)
        except TelethonNotInstalled:
            logger.warning("telethon not installed — skipping userbot polling.")
            break
        except Exception as e:
            logger.error(f"poll_all_accounts: account {account.id} failed: {e}")
    return total
