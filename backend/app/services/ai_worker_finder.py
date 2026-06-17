"""
AI Worker Finder Service
Ish beruvchining matnli e'lonini tahlil qiladi, bazadan eng mos ishchilarni topadi.
"""
import json
import logging
from typing import List, Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.resume import Resume, ResumeStatus
from app.models.profession import Profession
from app.models.location import Region
from app.schemas.ai import (
    AIWorkerFinderRequest,
    AIWorkerFinderResponse,
    MatchedWorker,
)
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIWorkerFinderService:
    """Finds matching workers from database based on employer's job description."""

    @staticmethod
    async def find_workers(
        db: AsyncSession, request: AIWorkerFinderRequest
    ) -> AIWorkerFinderResponse:
        """
        1. AI analyzes the job description to extract requirements
        2. Search database for matching resumes
        3. AI ranks the results by relevance
        """
        # Step 1: Get available professions for context
        prof_result = await db.execute(
            select(Profession).where(Profession.is_active == True)
        )
        professions = prof_result.scalars().all()
        prof_list = [
            {"id": p.id, "name": p.name_uz} for p in professions
        ]

        # Step 2: Ask AI to analyze the description
        analysis_prompt = (
            f"Ish beruvchining e'loni:\n\"{request.description}\"\n\n"
            f"Mavjud kasblar ro'yxati:\n{json.dumps(prof_list, ensure_ascii=False)}\n\n"
            f"Iltimos, quyidagilarni aniqlang:\n"
            f"1. profession_ids - mos kasblar ID lari (list)\n"
            f"2. min_experience - minimal tajriba (yillar, 0 agar aytilmagan bo'lsa)\n"
            f"3. keywords - qidiruv uchun kalit so'zlar (list)\n"
            f"4. summary - talab qisqacha (1 jumla)\n"
            f"JSON formatda javob bering."
        )

        ai_response = await ai_chat_completion(
            feature="worker_finder",
            user_message=analysis_prompt,
            temperature=0.2,
        )
        analysis = parse_ai_json(ai_response)

        # Step 3: Search database based on AI analysis
        profession_ids = analysis.get("profession_ids", [])
        min_experience = analysis.get("min_experience", 0)
        keywords = analysis.get("keywords", [])
        summary = analysis.get("summary", "")

        query = (
            select(Resume)
            .where(Resume.status == ResumeStatus.ACTIVE)
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
            )
        )

        # Filter by profession
        if profession_ids:
            query = query.where(Resume.profession_id.in_(profession_ids))

        # Filter by experience
        if min_experience > 0:
            query = query.where(Resume.experience >= min_experience)

        # Filter by region
        if request.region_id:
            query = query.where(Resume.region_id == request.region_id)

        # Execute query
        result = await db.execute(query.limit(request.max_results * 3))
        resumes = result.scalars().all()

        if not resumes:
            # Fallback: search by keywords in description
            if keywords:
                keyword_query = select(Resume).where(
                    Resume.status == ResumeStatus.ACTIVE
                ).options(
                    selectinload(Resume.profession),
                    selectinload(Resume.region),
                )
                keyword_filters = [
                    Resume.description.ilike(f"%{kw}%") for kw in keywords
                ]
                if keyword_filters:
                    keyword_query = keyword_query.where(or_(*keyword_filters))
                result = await db.execute(keyword_query.limit(request.max_results * 2))
                resumes = result.scalars().all()

        if not resumes:
            return AIWorkerFinderResponse(
                workers=[],
                total_found=0,
                search_summary=f"'{request.description}' bo'yicha mos ishchi topilmadi.",
            )

        # Step 4: Let AI rank the candidates
        candidates_data = []
        for r in resumes[:30]:  # Limit for AI context
            candidates_data.append({
                "id": r.id,
                "name": f"{r.first_name} {r.last_name}",
                "profession": r.profession.name_uz if r.profession else "Noma'lum",
                "experience": r.experience,
                "region": r.region.name_uz if r.region else "Noma'lum",
                "description": r.description[:200],
                "age": r.age,
            })

        ranking_prompt = (
            f"Talab: \"{request.description}\"\n\n"
            f"Nomzodlar:\n{json.dumps(candidates_data, ensure_ascii=False)}\n\n"
            f"Har bir nomzodni moslik darajasi bo'yicha baholang (0-100). "
            f"Eng moslarini birinchi qo'ying. Faqat 60% dan yuqori moslikdagilarni qo'shing.\n"
            f"Format: {{\"ranked\": [{{\"id\": N, \"score\": N, \"reason\": \"...\"}}]}}"
        )

        ranking_response = await ai_chat_completion(
            feature="worker_finder",
            user_message=ranking_prompt,
            temperature=0.2,
        )
        ranking = parse_ai_json(ranking_response)

        # Build response
        ranked_items = ranking.get("ranked", [])[:request.max_results]
        resume_map = {r.id: r for r in resumes}

        workers = []
        for item in ranked_items:
            resume = resume_map.get(item.get("id"))
            if resume:
                workers.append(MatchedWorker(
                    resume_id=resume.id,
                    full_name=f"{resume.first_name} {resume.last_name}",
                    profession=resume.profession.name_uz if resume.profession else "Noma'lum",
                    experience=resume.experience,
                    region=resume.region.name_uz if resume.region else "Noma'lum",
                    match_score=min(100, max(0, item.get("score", 0))),
                    match_reason=item.get("reason", ""),
                ))

        return AIWorkerFinderResponse(
            workers=workers,
            total_found=len(workers),
            search_summary=summary or f"'{request.description}' bo'yicha topilgan natijalar",
        )
