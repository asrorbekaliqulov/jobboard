import asyncio
import sys
from pathlib import Path

from sqlalchemy import select


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from app.core.config import settings  # noqa: E402
from app.core.database import async_session_maker  # noqa: E402
from app.models.vacancy import Vacancy  # noqa: E402
from app.models.resume import Resume  # noqa: E402
from app.services.vacancy import VacancyService  # noqa: E402
from app.services.resume import ResumeService  # noqa: E402


async def main() -> None:
    if not settings.TELEGRAM_CHANNEL_IDS:
        raise SystemExit("TELEGRAM_CHANNEL_IDS is not set in environment/.env")

    async with async_session_maker() as db:
        vacancy_id_result = await db.execute(select(Vacancy.id).order_by(Vacancy.id.asc()).limit(1))
        resume_id_result = await db.execute(select(Resume.id).order_by(Resume.id.asc()).limit(1))

        first_vacancy_id = vacancy_id_result.scalar_one_or_none()
        first_resume_id = resume_id_result.scalar_one_or_none()

        if first_vacancy_id is not None:
            first_vacancy = await VacancyService._get_by_id_with_relations(db, first_vacancy_id)
            if first_vacancy is not None:
                await VacancyService._publish_to_channel(db, first_vacancy)
                print(f"Vacancy sent: id={first_vacancy.id}")
        else:
            print("No vacancy records found.")

        if first_resume_id is not None:
            first_resume = await ResumeService._get_by_id_with_relations(db, first_resume_id)
            if first_resume is not None:
                await ResumeService._publish_to_channel(db, first_resume)
                print(f"Resume sent: id={first_resume.id}")
        else:
            print("No resume records found.")


if __name__ == "__main__":
    asyncio.run(main())
