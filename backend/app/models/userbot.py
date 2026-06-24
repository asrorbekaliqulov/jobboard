"""
Userbot models - manage Telegram userbot accounts and monitored channels.

These are NEW, SEPARATE tables. They DO NOT touch existing
users/vacancies/resumes data. The userbot reads vacancy posts from Telegram
channels, parses them with AI, and saves them as vacancies (status=active)
with source_type="channel".

NOTE: telethon stores the authorized session as a string in session_string.
"""
import enum

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class UserbotStatus(str, enum.Enum):
    NEW = "new"  # created, not authorized yet
    CODE_SENT = "code_sent"  # login code requested
    AUTHORIZED = "authorized"  # logged in, session saved
    ERROR = "error"  # something went wrong


class UserbotAccount(Base, TimestampMixin):
    """A real Telegram account used to read channels (telethon)."""

    __tablename__ = "userbot_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))  # human label
    phone: Mapped[str] = mapped_column(String(32))
    api_id: Mapped[int] = mapped_column(Integer)
    api_hash: Mapped[str] = mapped_column(String(255))

    # telethon StringSession (persisted across login steps)
    session_string: Mapped[str | None] = mapped_column(Text)
    # temporary hash returned by send_code_request (needed for sign_in)
    phone_code_hash: Mapped[str | None] = mapped_column(String(255))

    status: Mapped[str] = mapped_column(
        String(20), default=UserbotStatus.NEW.value
    )
    # whether the userbot should actively poll its channels
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    last_error: Mapped[str | None] = mapped_column(Text)

    channels: Mapped[list["UserbotChannel"]] = relationship(
        back_populates="account",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class UserbotChannel(Base, TimestampMixin):
    """A Telegram channel monitored by a userbot account."""

    __tablename__ = "userbot_channels"

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("userbot_accounts.id", ondelete="CASCADE"), index=True
    )

    # @username, t.me link, or numeric id (as text)
    channel_identifier: Mapped[str] = mapped_column(String(255))
    channel_title: Mapped[str | None] = mapped_column(String(255))
    channel_username: Mapped[str | None] = mapped_column(String(255))
    # downloaded channel profile photo (served from /uploads)
    channel_photo_url: Mapped[str | None] = mapped_column(String(1000))

    # comma-separated keywords / hashtags. Empty => accept all vacancy posts.
    keywords: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # last processed telegram message id (for incremental polling)
    last_message_id: Mapped[int | None] = mapped_column(Integer)
    # how many vacancies were imported from this channel
    imported_count: Mapped[int] = mapped_column(Integer, default=0)

    account: Mapped["UserbotAccount"] = relationship(back_populates="channels")
