import enum
import logging

from app.core.config import settings
from app.core.database import Base
from app.models.base import TimestampMixin
from app.utils.telegram_md import escape_md_plain, escape_md_url, prepare_md_description
from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

logger = logging.getLogger(__name__)


class ResumeStatus(str, enum.Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    DELETED = "deleted"
    ARCHIVED = "archived"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    ANY = "any"


class Resume(Base, TimestampMixin):
    __tablename__ = "resumes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    first_name: Mapped[str] = mapped_column(String(255))
    last_name: Mapped[str] = mapped_column(String(255))
    middle_name: Mapped[str | None] = mapped_column(String(255))
    age: Mapped[int] = mapped_column(Integer)
    profession_id: Mapped[int] = mapped_column(ForeignKey("professions.id"))
    region_id: Mapped[int] = mapped_column(ForeignKey("regions.id"))
    gender: Mapped[Gender] = mapped_column(Enum(Gender))
    experience: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(2000))
    phone: Mapped[str] = mapped_column(String(20))
    telegram: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    portfolio: Mapped[str | None] = mapped_column(String(255))  # File path or URL
    video: Mapped[str | None] = mapped_column(String(255))  # File path or URL
    status: Mapped[ResumeStatus] = mapped_column(
        Enum(ResumeStatus), default=ResumeStatus.DRAFT
    )
    viewed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    channel_id: Mapped[str | None] = mapped_column(String(255))
    message_id: Mapped[int | None] = mapped_column(Integer)

    user: Mapped["User"] = relationship()
    profession: Mapped["Profession"] = relationship()
    region: Mapped["Region"] = relationship()

    def format_channel_message(self) -> str:
        gender_map = {
            Gender.MALE: "Erkak",
            Gender.FEMALE: "Ayol",
            Gender.ANY: "—",
        }
        profession_name = (
            self.profession.name_uz
            if getattr(self, "profession", None) is not None
            else f"—"
        )
        region_name = (
            self.region.name_uz if getattr(self, "region", None) is not None else f"—"
        )
        full_name = " ".join(
            filter(None, [self.first_name, self.last_name, self.middle_name])
        )

        lines = [
            "📄 *Yangi rezyume*",
            "",
            f"👤 *Nomzod:* {escape_md_plain(full_name)}",
            f"💼 *Kasb:* {escape_md_plain(profession_name)}",
            f"📍 *Hudud:* {escape_md_plain(region_name)}",
            f"🎂 *Yosh:* {self.age}",
            f"🧠 *Tajriba:* {self.experience} yil",
            f"🚻 *Jins:* {escape_md_plain(gender_map.get(self.gender, self.gender.value))}",
            "",
            f"📝 *O'zi haqida:*\n{prepare_md_description(self.description)}",
            "",
            "📞 *Aloqa:*",
            f"• *Telefon:* {escape_md_plain(self.phone)}",
            f"• *Telegram:* @{escape_md_plain(self.telegram.lstrip('@'))}",
        ]
        if self.email:
            lines.append(f"• *Email:* {escape_md_plain(self.email)}")
        if self.portfolio:
            portfolio_url = (
                self.portfolio
                if self.portfolio.startswith("http")
                else settings.MINI_APP_URL + self.portfolio
            )
            lines.append(f"• [Portfolio]({escape_md_url(portfolio_url)})")

        lines.append("")
        lines.append("#rezyume #ishchi")
        return "\n".join(lines)
