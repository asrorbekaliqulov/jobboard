import enum

from app.core.database import Base
from app.models.base import TimestampMixin
from sqlalchemy import BigInteger, Enum, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class ChannelMessageEntity(str, enum.Enum):
    VACANCY = "vacancy"
    RESUME = "resume"


class ChannelMessage(Base, TimestampMixin):
    __tablename__ = "channel_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[ChannelMessageEntity] = mapped_column(
        Enum(ChannelMessageEntity)
    )
    entity_id: Mapped[int] = mapped_column(Integer)
    channel_id: Mapped[str] = mapped_column(String(255))
    message_id: Mapped[int] = mapped_column(BigInteger)

    __table_args__ = (Index("ix_channel_messages_entity", "entity_type", "entity_id"),)
