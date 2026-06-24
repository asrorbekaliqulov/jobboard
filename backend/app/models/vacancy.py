from sqlalchemy import String, ForeignKey, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.utils.telegram_md import escape_md_plain, prepare_md_description
import enum


class VacancyStatus(str, enum.Enum):
    ACTIVE = "active"
    DRAFT = "draft"
    DELETED = "deleted"
    ARCHIVED = "archived"


class WorkFormat(str, enum.Enum):
    ONSITE = "onsite"
    REMOTE = "remote"


class WorkType(str, enum.Enum):
    FULLTIME = "fulltime"
    PART_TIME = "part-time"


class WorkSchedule(str, enum.Enum):
    S_6_1 = "6/1"
    S_5_2 = "5/2"
    S_7_0 = "7/0"


class Vacancy(Base, TimestampMixin):
    __tablename__ = "vacancies"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_name: Mapped[str] = mapped_column(String(255))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    profession_id: Mapped[int] = mapped_column(ForeignKey("professions.id"))
    region_id: Mapped[int] = mapped_column(ForeignKey("regions.id"))
    status: Mapped[VacancyStatus] = mapped_column(Enum(VacancyStatus), default=VacancyStatus.DRAFT)
    description: Mapped[str] = mapped_column(String(2000))
    work_format: Mapped[WorkFormat] = mapped_column(Enum(WorkFormat))
    work_type: Mapped[WorkType] = mapped_column(Enum(WorkType))
    work_hours: Mapped[int] = mapped_column(Integer)
    phone: Mapped[str] = mapped_column(String(20))
    telegram: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    schedule: Mapped[WorkSchedule] = mapped_column(Enum(WorkSchedule))
    exp_from: Mapped[int] = mapped_column(Integer)
    exp_till: Mapped[int] = mapped_column(Integer)
    salary_from: Mapped[int | None] = mapped_column(Integer)
    salary_till: Mapped[int | None] = mapped_column(Integer)
    viewed_count: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(1000))
    video_url: Mapped[str | None] = mapped_column(String(1000))
    channel_id: Mapped[str | None] = mapped_column(String(255))
    message_id: Mapped[int | None] = mapped_column(Integer)

    # Source tracking (for vacancies imported by the userbot from TG channels).
    # All nullable/additive — normal user-created vacancies leave these empty.
    source_type: Mapped[str | None] = mapped_column(String(32))  # e.g. "channel"
    source_url: Mapped[str | None] = mapped_column(String(1000))  # original post link
    source_channel: Mapped[str | None] = mapped_column(String(255))  # channel title/@username

    user: Mapped["User"] = relationship()
    profession: Mapped["Profession"] = relationship()
    region: Mapped["Region"] = relationship()

    def format_channel_message(self) -> str:
        work_type_map = {
            WorkType.FULLTIME: "Full-time",
            WorkType.PART_TIME: "Part-time",
        }
        work_format_map = {
            WorkFormat.ONSITE: "On-site",
            WorkFormat.REMOTE: "Remote",
        }
        schedule_map = {
            WorkSchedule.S_6_1: "6/1",
            WorkSchedule.S_5_2: "5/2",
            WorkSchedule.S_7_0: "7/0",
        }

        profession_name = (
            self.profession.name_uz
            if getattr(self, "profession", None) is not None
            else "—"
        )
        region_name = (
            self.region.name_uz
            if getattr(self, "region", None) is not None
            else "—"
        )
        salary_text = "Kelishiladi"
        if self.salary_from is not None and self.salary_till is not None:
            salary_text = f"{self.salary_from:,} - {self.salary_till:,} so'm".replace(",", " ")
        elif self.salary_from is not None:
            salary_text = f"{self.salary_from:,} so'm dan boshlab".replace(",", " ")
        elif self.salary_till is not None:
            salary_text = f"{self.salary_till:,} so'm gacha".replace(",", " ")

        lines = [
            "📢 *Yangi vakansiya*",
            "",
            f"💼 *Lavozim:* {escape_md_plain(profession_name)}",
            f"🏢 *Kompaniya:* {escape_md_plain(self.company_name)}",
            f"📍 *Hudud:* {escape_md_plain(region_name)}",
            f"🕒 *Ish turi:* {work_type_map.get(self.work_type, self.work_type.value)} / "
            f"{work_format_map.get(self.work_format, self.work_format.value)}",
            f"📅 *Grafik:* {schedule_map.get(self.schedule, self.schedule.value)}",
            f"⏱ *Ish soati:* {self.work_hours} soat",
            f"🧠 *Tajriba:* {self.exp_from}-{self.exp_till} yil",
            f"💰 *Maosh:* {escape_md_plain(salary_text)}",
            "",
            f"📝 *Izoh:*\n{prepare_md_description(self.description)}",
            "",
            "📞 *Aloqa:*",
            f"• *Telefon:* {escape_md_plain(self.phone)}",
            f"• *Telegram:* @{escape_md_plain(self.telegram.lstrip('@'))}",
        ]
        if self.email:
            lines.append(f"• *Email:* {escape_md_plain(self.email)}")

        lines.append("")
        lines.append("#vakansiya #ish")
        return "\n".join(lines)
