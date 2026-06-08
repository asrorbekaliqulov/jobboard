"""
One-time script: set viewed_count for all vacancies, resumes, and daily job seekers
to a random value between 4000 and 5000.

Usage (from inside the backend container or with venv active):
    python scripts/seed_viewed_counts.py
"""
import asyncio
import random
import sys
import os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.append(project_root)

from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.vacancy import Vacancy
from app.models.resume import Resume
from app.models.daily_job_seeker import DailyJobSeeker


async def seed():
    async with async_session_maker() as db:
        try:
            vacancies = (await db.execute(select(Vacancy))).scalars().all()
            resumes = (await db.execute(select(Resume))).scalars().all()
            daily = (await db.execute(select(DailyJobSeeker))).scalars().all()

            for v in vacancies:
                v.viewed_count = random.randint(4000, 5000)
            for r in resumes:
                r.viewed_count = random.randint(4000, 5000)
            for d in daily:
                d.viewed_count = random.randint(4000, 5000)

            await db.commit()
            print(
                f"Done: {len(vacancies)} vacancies, {len(resumes)} resumes, "
                f"{len(daily)} daily job seekers — viewed_count set to 4000–5000."
            )
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
