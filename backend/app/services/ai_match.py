"""
AI Match System Service
Resume va vakansiya mosligini foizlarda hisoblaydi.
"""
import json
import logging
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.resume import Resume, ResumeStatus
from app.models.vacancy import Vacancy, VacancyStatus
from app.models.ai_models import AIMatchResult
from app.schemas.ai import AIMatchRequest, AIMatchResponse, AIBulkMatchRequest, AIBulkMatchResponse
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIMatchService:
    """Calculates compatibility between resumes and vacancies."""

    @staticmethod
    async def calculate_match(
        db: AsyncSession, request: AIMatchRequest
    ) -> AIMatchResponse:
        """Calculate match percentage between a resume and vacancy."""
        
        # Get resume with relations
        resume_query = (
            select(Resume)
            .where(Resume.id == request.resume_id)
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
            )
        )
        result = await db.execute(resume_query)
        resume = result.scalar_one_or_none()
        if not resume:
            raise ValueError("Rezyume topilmadi")

        # Get vacancy with relations
        vacancy_query = (
            select(Vacancy)
            .where(Vacancy.id == request.vacancy_id)
            .options(
                selectinload(Vacancy.profession),
                selectinload(Vacancy.region),
            )
        )
        result = await db.execute(vacancy_query)
        vacancy = result.scalar_one_or_none()
        if not vacancy:
            raise ValueError("Vakansiya topilmadi")

        # Rule-based scoring first
        scores = AIMatchService._calculate_base_scores(resume, vacancy)

        # AI enhancement - get explanation and fine-tune scores
        resume_data = {
            "profession": resume.profession.name_uz if resume.profession else "Noma'lum",
            "experience": resume.experience,
            "region": resume.region.name_uz if resume.region else "Noma'lum",
            "age": resume.age,
            "description": resume.description[:300],
        }
        vacancy_data = {
            "profession": vacancy.profession.name_uz if vacancy.profession else "Noma'lum",
            "exp_from": vacancy.exp_from,
            "exp_till": vacancy.exp_till,
            "region": vacancy.region.name_uz if vacancy.region else "Noma'lum",
            "salary_from": vacancy.salary_from,
            "salary_till": vacancy.salary_till,
            "description": vacancy.description[:300],
            "work_format": vacancy.work_format.value if vacancy.work_format else "",
        }

        prompt = (
            f"Rezyume: {json.dumps(resume_data, ensure_ascii=False)}\n"
            f"Vakansiya: {json.dumps(vacancy_data, ensure_ascii=False)}\n\n"
            f"Oldindan hisoblangan ballar: {json.dumps(scores, ensure_ascii=False)}\n\n"
            f"Moslik tahlilini qiling:\n"
            f"1. Ballarni tekshirib, kerak bo'lsa tuzating\n"
            f"2. O'zbek tilida qisqa tushuntirish yozing\n"
            f"3. Nomzodga 2-3 ta tavsiya bering\n\n"
            f"Format:\n"
            f"{{\n"
            f'  "overall_match": 0-100,\n'
            f'  "profession_match": 0-100,\n'
            f'  "experience_match": 0-100,\n'
            f'  "location_match": 0-100,\n'
            f'  "salary_match": 0-100,\n'
            f'  "explanation": "Tushuntirish",\n'
            f'  "recommendations": ["tavsiya1", "tavsiya2"]\n'
            f"}}"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="match_system",
                user_message=prompt,
                temperature=0.2,
            )
            ai_result = parse_ai_json(ai_response)
            
            match_response = AIMatchResponse(
                overall_match=ai_result.get("overall_match", scores["overall"]),
                profession_match=ai_result.get("profession_match", scores["profession"]),
                experience_match=ai_result.get("experience_match", scores["experience"]),
                location_match=ai_result.get("location_match", scores["location"]),
                salary_match=ai_result.get("salary_match", scores["salary"]),
                explanation=ai_result.get("explanation", ""),
                recommendations=ai_result.get("recommendations", []),
            )
        except Exception as e:
            logger.error(f"AI match enhancement failed: {e}")
            match_response = AIMatchResponse(
                overall_match=scores["overall"],
                profession_match=scores["profession"],
                experience_match=scores["experience"],
                location_match=scores["location"],
                salary_match=scores["salary"],
                explanation="Bazaviy tahlil natijalari",
                recommendations=["AI tahlili vaqtincha mavjud emas"],
            )

        # Save to cache
        try:
            match_record = AIMatchResult(
                resume_id=request.resume_id,
                vacancy_id=request.vacancy_id,
                user_id=resume.user_id,
                overall_match=match_response.overall_match,
                profession_match=match_response.profession_match,
                experience_match=match_response.experience_match,
                location_match=match_response.location_match,
                salary_match=match_response.salary_match,
                explanation=match_response.explanation,
            )
            db.add(match_record)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to cache match result: {e}")
            await db.rollback()

        return match_response

    @staticmethod
    async def bulk_match(
        db: AsyncSession, request: AIBulkMatchRequest
    ) -> AIBulkMatchResponse:
        """Match a resume against all active vacancies."""
        
        # Get resume
        resume_query = (
            select(Resume)
            .where(Resume.id == request.resume_id)
            .options(selectinload(Resume.profession), selectinload(Resume.region))
        )
        result = await db.execute(resume_query)
        resume = result.scalar_one_or_none()
        if not resume:
            raise ValueError("Rezyume topilmadi")

        # Get active vacancies
        vacancies_query = (
            select(Vacancy)
            .where(Vacancy.status == VacancyStatus.ACTIVE)
            .options(selectinload(Vacancy.profession), selectinload(Vacancy.region))
            .order_by(Vacancy.created_at.desc())
            .limit(100)  # Get more than needed for filtering
        )
        result = await db.execute(vacancies_query)
        vacancies = result.scalars().all()

        # Calculate base scores for all and sort
        scored_vacancies = []
        for vacancy in vacancies:
            scores = AIMatchService._calculate_base_scores(resume, vacancy)
            scored_vacancies.append((vacancy, scores))

        # Sort by overall score and take top N
        scored_vacancies.sort(key=lambda x: x[1]["overall"], reverse=True)
        top_vacancies = scored_vacancies[:request.limit]

        matches = []
        for vacancy, scores in top_vacancies:
            matches.append(AIMatchResponse(
                overall_match=scores["overall"],
                profession_match=scores["profession"],
                experience_match=scores["experience"],
                location_match=scores["location"],
                salary_match=scores["salary"],
                explanation=f"{vacancy.profession.name_uz if vacancy.profession else 'Vakansiya'} - "
                           f"{vacancy.company_name}",
                recommendations=[],
            ))

        return AIBulkMatchResponse(
            matches=matches,
            resume_summary=f"{resume.first_name} {resume.last_name} - "
                          f"{resume.profession.name_uz if resume.profession else 'Ishchi'}",
        )

    @staticmethod
    def _calculate_base_scores(resume: Resume, vacancy: Vacancy) -> dict:
        """Calculate rule-based match scores."""
        scores = {}

        # Profession match
        if resume.profession_id == vacancy.profession_id:
            scores["profession"] = 100
        elif (resume.profession and vacancy.profession and 
              resume.profession.category_id and vacancy.profession.category_id and
              resume.profession.category_id == vacancy.profession.category_id):
            scores["profession"] = 60
        else:
            scores["profession"] = 20

        # Experience match
        if vacancy.exp_from <= resume.experience <= vacancy.exp_till:
            scores["experience"] = 100
        elif resume.experience >= vacancy.exp_from:
            scores["experience"] = 80
        elif resume.experience >= vacancy.exp_from - 1:
            scores["experience"] = 60
        else:
            diff = vacancy.exp_from - resume.experience
            scores["experience"] = max(0, 100 - diff * 20)

        # Location match
        if resume.region_id == vacancy.region_id:
            scores["location"] = 100
        else:
            scores["location"] = 40  # Different region

        # Salary match (if resume has no salary expectation, give 70%)
        if vacancy.salary_from and vacancy.salary_till:
            scores["salary"] = 70  # Default if no comparison data
        else:
            scores["salary"] = 70

        # Overall (weighted average)
        scores["overall"] = int(
            scores["profession"] * 0.35 +
            scores["experience"] * 0.25 +
            scores["location"] * 0.20 +
            scores["salary"] * 0.20
        )

        return scores
