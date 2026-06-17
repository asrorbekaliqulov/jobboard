"""
AI Gig Economy Service
Kunlik/tezkor ishlar uchun eng yaqin bo'sh ishchilarni topadi.
"""
import json
import logging
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.daily_job_seeker import DailyJobSeeker, Work, daily_job_seeker_works
from app.models.resume import ResumeStatus
from app.models.location import Region, District
from app.schemas.ai import AIGigMatchRequest, AIGigMatchResponse, GigWorkerMatch
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIGigEconomyService:
    """Matches gig/daily work requests with available workers."""

    @staticmethod
    async def find_gig_workers(
        db: AsyncSession, request: AIGigMatchRequest
    ) -> AIGigMatchResponse:
        """
        Find available daily job seekers for short-term work.
        Uses location (region/district) and work type matching.
        """
        # Step 1: Query daily job seekers in the same region
        query = (
            select(DailyJobSeeker)
            .where(
                DailyJobSeeker.status == ResumeStatus.ACTIVE,
                DailyJobSeeker.region_id == request.region_id,
            )
            .options(
                selectinload(DailyJobSeeker.works),
                selectinload(DailyJobSeeker.region),
                selectinload(DailyJobSeeker.districts),
            )
            .limit(50)
        )

        result = await db.execute(query)
        seekers = result.scalars().all()

        if not seekers:
            return AIGigMatchResponse(
                matched_workers=[],
                total_available=0,
                ai_summary="Ushbu hududda hozircha kunlik ishchilar topilmadi.",
            )

        # Step 2: Prepare data for AI ranking
        seekers_data = []
        for s in seekers:
            seekers_data.append({
                "id": s.id,
                "name": f"{s.first_name} {s.last_name}",
                "works": [w.name_uz for w in s.works] if s.works else [],
                "region": s.region.name_uz if s.region else "",
                "districts": [d.name_uz for d in s.districts] if s.districts else [],
                "experience": s.experience,
                "additional_workers": s.additional_workers,
                "description": s.description[:150],
            })

        # Step 3: AI ranks workers by relevance
        prompt = (
            f"Ish beruvchining talabi:\n"
            f"- Ish turi: {request.work_description}\n"
            f"- Kerakli ishchilar soni: {request.needed_workers}\n"
            f"- Shoshilinchlik: {request.urgency}\n"
            f"- Byudjet: {request.budget or 'Kelishiladi'} so'm\n\n"
            f"Mavjud kunlik ishchilar:\n"
            f"{json.dumps(seekers_data, ensure_ascii=False)}\n\n"
            f"Eng mos ishchilarni tanlang va baho bering (0-100).\n"
            f"Faqat haqiqatan mos kelganlarini qaytaring.\n\n"
            f"Format:\n"
            f"{{\n"
            f'  "matched": [\n'
            f'    {{"id": N, "score": 0-100, "available": true}}\n'
            f'  ],\n'
            f'  "summary": "Qisqa xulosa"\n'
            f"}}"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="gig_economy",
                user_message=prompt,
                temperature=0.3,
            )
            ai_result = parse_ai_json(ai_response)
        except Exception as e:
            logger.error(f"AI gig matching failed: {e}")
            # Fallback: return all seekers with default scores
            ai_result = {
                "matched": [{"id": s.id, "score": 70, "available": True} for s in seekers[:request.needed_workers]],
                "summary": "AI tahlilisiz asosiy natijalar",
            }

        # Build response
        seeker_map = {s.id: s for s in seekers}
        matched_workers = []
        for item in ai_result.get("matched", [])[:request.needed_workers * 2]:
            seeker = seeker_map.get(item.get("id"))
            if seeker:
                matched_workers.append(GigWorkerMatch(
                    daily_job_seeker_id=seeker.id,
                    full_name=f"{seeker.first_name} {seeker.last_name}",
                    works=[w.name_uz for w in seeker.works] if seeker.works else [],
                    region=seeker.region.name_uz if seeker.region else "",
                    districts=[d.name_uz for d in seeker.districts] if seeker.districts else [],
                    match_score=min(100, max(0, item.get("score", 0))),
                    available=item.get("available", True),
                ))

        return AIGigMatchResponse(
            matched_workers=matched_workers,
            total_available=len(seekers),
            ai_summary=ai_result.get("summary", f"{len(matched_workers)} ta mos ishchi topildi"),
        )
