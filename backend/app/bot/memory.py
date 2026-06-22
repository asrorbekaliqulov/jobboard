"""
Bot Conversation Memory
Stores conversation history per user in Redis (with in-memory fallback).
Keeps last N messages so the bot remembers context across days.
"""
import json
import logging
import time
from typing import List, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configuration
MAX_MESSAGES = 60  # How many messages to remember per user
MEMORY_TTL = 60 * 60 * 24 * 7  # 7 days retention

# In-memory fallback (when Redis is not configured)
_memory_store: Dict[str, List[dict]] = {}

_redis_client = None


def _get_redis():
    """Lazy Redis client."""
    global _redis_client
    if _redis_client is None and settings.use_redis:
        try:
            from redis.asyncio import Redis
            _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.error(f"Redis init failed: {e}")
            _redis_client = None
    return _redis_client


def _key(telegram_id: str) -> str:
    return f"bot_chat_history:{telegram_id}"


async def get_history(telegram_id: str) -> List[dict]:
    """Get conversation history for a user."""
    redis = _get_redis()
    if redis:
        try:
            raw = await redis.get(_key(telegram_id))
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.error(f"Redis get_history failed: {e}")
    # Fallback
    return _memory_store.get(telegram_id, [])


async def save_message(
    telegram_id: str,
    role: str,
    content,
    message_id: Optional[int] = None,
    summary: Optional[str] = None,
) -> None:
    """
    Save a message to history.
    role: 'user' or 'assistant'
    content: text content (string)
    message_id: Telegram message_id (for reply-to feature)
    summary: short summary of what this message was about
    """
    history = await get_history(telegram_id)

    entry = {
        "role": role,
        "content": content,
        "ts": int(time.time()),
    }
    if message_id is not None:
        entry["message_id"] = message_id
    if summary:
        entry["summary"] = summary

    history.append(entry)

    # Trim to max
    if len(history) > MAX_MESSAGES:
        history = history[-MAX_MESSAGES:]

    redis = _get_redis()
    if redis:
        try:
            await redis.setex(_key(telegram_id), MEMORY_TTL, json.dumps(history, ensure_ascii=False))
            return
        except Exception as e:
            logger.error(f"Redis save_message failed: {e}")
    # Fallback
    _memory_store[telegram_id] = history


async def clear_history(telegram_id: str) -> None:
    """Clear conversation history."""
    redis = _get_redis()
    if redis:
        try:
            await redis.delete(_key(telegram_id))
        except Exception:
            pass
    _memory_store.pop(telegram_id, None)


async def build_openai_messages(telegram_id: str, system_prompt: str, new_user_content) -> list:
    """
    Build the messages list for OpenAI from history + new message.
    Returns messages in OpenAI format.
    """
    history = await get_history(telegram_id)

    messages = [{"role": "system", "content": system_prompt}]

    # Add history (only role + content, skip metadata)
    for entry in history:
        role = entry.get("role")
        content = entry.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    # Add new user message
    messages.append({"role": "user", "content": new_user_content})

    return messages


async def find_message_about(telegram_id: str, keyword: str) -> Optional[dict]:
    """
    Find a previous message related to a keyword (for reply-to feature).
    Returns the message entry with message_id if found.
    """
    history = await get_history(telegram_id)
    keyword_lower = keyword.lower()

    # Search from newest to oldest for assistant messages with message_id
    for entry in reversed(history):
        if entry.get("role") == "assistant" and entry.get("message_id"):
            content = (entry.get("content") or "").lower()
            summary = (entry.get("summary") or "").lower()
            if keyword_lower in content or keyword_lower in summary:
                return entry
    return None



# ═══════════════════════════════════════════════════════════════
# Daily CV generation limit (3 per day)
# ═══════════════════════════════════════════════════════════════

DAILY_CV_LIMIT = 3

_cv_count_store: Dict[str, dict] = {}  # fallback {tg_id: {date: count}}


def _cv_key(telegram_id: str) -> str:
    import datetime
    today = datetime.date.today().isoformat()
    return f"cv_count:{telegram_id}:{today}"


async def get_cv_count(telegram_id: str) -> int:
    """Get how many CVs the user generated today."""
    redis = _get_redis()
    if redis:
        try:
            val = await redis.get(_cv_key(telegram_id))
            return int(val) if val else 0
        except Exception:
            pass
    import datetime
    today = datetime.date.today().isoformat()
    return _cv_count_store.get(telegram_id, {}).get(today, 0)


async def increment_cv_count(telegram_id: str) -> int:
    """Increment today's CV count. Returns new count."""
    redis = _get_redis()
    if redis:
        try:
            key = _cv_key(telegram_id)
            new_val = await redis.incr(key)
            if new_val == 1:
                await redis.expire(key, 60 * 60 * 25)  # ~1 day
            return new_val
        except Exception:
            pass
    import datetime
    today = datetime.date.today().isoformat()
    user_counts = _cv_count_store.setdefault(telegram_id, {})
    user_counts[today] = user_counts.get(today, 0) + 1
    return user_counts[today]


async def can_generate_cv(telegram_id: str) -> bool:
    """Check if user is under the daily CV limit."""
    return (await get_cv_count(telegram_id)) < DAILY_CV_LIMIT
