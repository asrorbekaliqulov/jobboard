"""Helpers for Telegram Markdown (legacy) parse mode.

Telegram Markdown uses *bold* and _italic_. User content may use ** and __
(common Markdown). We convert those and escape reserved chars in plain text.
"""


def escape_md_plain(text: str) -> str:
    """Escape special chars for Telegram Markdown in plain text (no formatting)."""
    return text.replace("\\", "\\\\").replace("_", "\\_").replace("*", "\\*").replace("`", "\\`").replace("[", "\\[")


def escape_md_url(url: str) -> str:
    """Escape URL for use inside [text](url) - escape ) and \\ to prevent breaking the link."""
    return url.replace("\\", "\\\\").replace(")", "\\)")


def prepare_md_description(text: str) -> str:
    """Convert **/__ to */_ for Telegram, escape backslash. Preserves user bold/italic."""
    # Convert ** to * and __ to _ so user formatting works with Telegram Markdown
    s = text.replace("**", "*").replace("__", "_")
    # Escape backslash first, then \ could break other escapes
    return s.replace("\\", "\\\\")
