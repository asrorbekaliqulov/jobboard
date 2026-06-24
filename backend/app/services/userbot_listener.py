"""
Real-time userbot listener.

Unlike the 15-minute polling backstop (userbot_manager.poll_all_accounts),
this keeps authorized accounts connected and reacts the MOMENT a new post is
published in a monitored channel:

    post published -> keyword/hashtag check -> AI decides (vacancy or not)
    -> if vacancy, save to DB (status=active, source_type="channel").

It is fully guarded: if telethon is missing or anything fails, the app still
boots and the polling job continues to work as a fallback.
"""
import logging

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import async_session_maker
from app.models.userbot import UserbotAccount, UserbotChannel, UserbotStatus
from app.services import userbot_manager as mgr
from app.services.userbot_parser import parse_channel_post

logger = logging.getLogger(__name__)

# account_id -> connected telethon client
_clients: dict[int, object] = {}


def _post_url(info: dict, chat_id: int, message_id: int) -> str:
    username = info.get("username")
    if username:
        return f"https://t.me/{username}/{message_id}"
    cid = str(abs(int(chat_id)))
    if cid.startswith("100"):
        cid = cid[3:]
    return f"https://t.me/c/{cid}/{message_id}"


async def _handle_new_message(event, chat_map: dict):
    """Process a single new channel post in real time."""
    try:
        info = chat_map.get(event.chat_id)
        if not info:
            return
        text = event.message.message or ""
        if not text:
            return
        # Exact keyword/hashtag gate (no keywords => accept all)
        if not mgr._match_keywords(text, info.get("keywords")):
            return
        # AI decides whether this is a vacancy we should keep
        parsed = await parse_channel_post(text)
        if not parsed:
            return

        async with async_session_maker() as db:
            channel = (
                await db.execute(
                    select(UserbotChannel).where(UserbotChannel.id == info["channel_id"])
                )
            ).scalar_one_or_none()
            if not channel:
                return

            system_user_id = await mgr._get_system_user_id(db)

            photo_url = channel.channel_photo_url
            if not photo_url:
                try:
                    chat = await event.get_chat()
                    photo_url = await mgr._ensure_channel_photo(event.client, chat, channel, db)
                except Exception:
                    photo_url = None

            url = _post_url(info, event.chat_id, event.id)

            # Daily per-channel cap (shared with the polling backstop). The count
            # is read from the vacancies table, so both paths respect one limit.
            url_prefix = url.rsplit("/", 1)[0] + "/"
            if await mgr._today_import_count(db, url_prefix) >= mgr.DAILY_CHANNEL_LIMIT:
                if event.id > (channel.last_message_id or 0):
                    channel.last_message_id = event.id
                await db.commit()
                logger.info(
                    f"Real-time: channel {channel.id} daily limit reached; skipping post."
                )
                return

            # Prefer the post's own image; fall back to the channel profile photo.
            post_image = await mgr._download_post_image(event.client, event.message, channel.id)
            image_url = post_image or photo_url

            created = await mgr._save_vacancy(
                db,
                parsed,
                system_user_id=system_user_id,
                post_url=url,
                channel_title=info.get("title") or channel.channel_identifier,
                image_url=image_url,
                contact_telegram=info.get("username"),
            )
            if event.id > (channel.last_message_id or 0):
                channel.last_message_id = event.id
            if created:
                channel.imported_count = (channel.imported_count or 0) + 1
            await db.commit()
            if created:
                logger.info(f"Real-time: imported vacancy from channel {channel.id}")
    except Exception as e:
        logger.error(f"Real-time handler error: {e}")


async def _start_account(account: UserbotAccount):
    from telethon import events

    if account.id in _clients:
        return
    client = await mgr._new_client(account, account.session_string or "")
    try:
        if not await client.is_user_authorized():
            await client.disconnect()
            return

        chat_map: dict[int, dict] = {}
        monitored = []
        for ch in account.channels:
            if not ch.is_active:
                continue
            try:
                ent = await client.get_entity(ch.channel_identifier)
            except Exception as e:
                logger.warning(f"listener get_entity failed for {ch.channel_identifier}: {e}")
                continue
            chat_map[ent.id] = {
                "channel_id": ch.id,
                "keywords": ch.keywords,
                "username": getattr(ent, "username", None),
                "title": getattr(ent, "title", None),
            }
            monitored.append(ent)
            await mgr._human_pause(mgr.MIN_DELAY_BETWEEN_CHANNELS)

        if not chat_map:
            await client.disconnect()
            return

        @client.on(events.NewMessage(chats=monitored))
        async def _on_new(event):
            await _handle_new_message(event, chat_map)

        _clients[account.id] = client
        logger.info(
            f"Real-time listener active for account {account.id} ({len(chat_map)} channels)."
        )
    except Exception as e:
        logger.error(f"Failed to start listener for account {account.id}: {e}")
        try:
            await client.disconnect()
        except Exception:
            pass


async def start_all_listeners():
    """Start real-time listeners for all active, authorized accounts."""
    try:
        mgr._import_telethon()
    except mgr.TelethonNotInstalled:
        logger.warning("telethon not installed — real-time listener disabled (polling still works).")
        return
    except Exception as e:
        logger.warning(f"telethon import issue — real-time listener disabled: {e}")
        return

    async with async_session_maker() as db:
        result = await db.execute(
            select(UserbotAccount)
            .where(
                UserbotAccount.is_active.is_(True),
                UserbotAccount.status == UserbotStatus.AUTHORIZED.value,
            )
            .options(selectinload(UserbotAccount.channels))
        )
        accounts = result.scalars().all()

    for account in accounts:
        try:
            await _start_account(account)
        except Exception as e:
            logger.error(f"start_all_listeners: account {account.id} failed: {e}")


async def stop_all_listeners():
    """Disconnect all real-time listener clients."""
    for account_id, client in list(_clients.items()):
        try:
            await client.disconnect()
        except Exception:
            pass
        _clients.pop(account_id, None)
    logger.info("Real-time listeners stopped.")


async def reload_listeners():
    """Restart listeners after admin changes (accounts/channels)."""
    await stop_all_listeners()
    await start_all_listeners()
