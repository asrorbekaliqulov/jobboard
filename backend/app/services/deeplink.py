"""Central deep-link helpers shared by the bot, delivery and API.

A single source of truth so vacancy/resume links are identical everywhere
(bot recommendations, share buttons, link analysis).
"""
import re
from typing import Optional, Tuple

from app.core.config import settings


def vacancy_deeplink(vacancy_id: int) -> str:
    """Deep link that opens a specific vacancy in the Mini App."""
    if settings.BOT_USERNAME and settings.MINI_APP_NAME:
        return f"https://t.me/{settings.BOT_USERNAME}/{settings.MINI_APP_NAME}?startapp=vacancy_{vacancy_id}"
    base = (settings.MINI_APP_URL or "").rstrip("/")
    return f"{base}?vacancy={vacancy_id}"


def resume_deeplink(resume_id: int) -> str:
    """Deep link that opens a specific resume in the Mini App."""
    if settings.BOT_USERNAME and settings.MINI_APP_NAME:
        return f"https://t.me/{settings.BOT_USERNAME}/{settings.MINI_APP_NAME}?startapp=resume_{resume_id}"
    base = (settings.MINI_APP_URL or "").rstrip("/")
    return f"{base}?resume={resume_id}"


def telegram_share_url(link: str, text: str = "") -> str:
    """Build a t.me/share/url link that opens Telegram's native share sheet."""
    from urllib.parse import quote
    return f"https://t.me/share/url?url={quote(link, safe='')}&text={quote(text, safe='')}"


# Matches: "vacancy_123", "vacancy=123", "resume_45", "resume=45" (any case),
# including inside a full t.me/...startapp=vacancy_123 link.
_ENTITY_RE = re.compile(r"(vacancy|resume)[_=](\d+)", re.IGNORECASE)


def parse_entity_link(text: Optional[str]) -> Optional[Tuple[str, int]]:
    """Detect a vacancy/resume reference in free text.

    Returns (kind, id) where kind is "vacancy" or "resume", or None.
    """
    if not text:
        return None
    match = _ENTITY_RE.search(text)
    if not match:
        return None
    return match.group(1).lower(), int(match.group(2))
