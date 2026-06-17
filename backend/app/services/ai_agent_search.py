"""
AI Agent Search Service
Agent-style search: analyze query → find categories → search DB → rank results.
Works like function calling - step by step reasoning.
"""
import json
import logging
from typing import Optional, List

from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vacancy import Vacancy, VacancyStatus
from app.models.resume import Resume, ResumeStatus
from app.models.profession import Profession
from app.models.location import Region
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIAgentSearchService:
    """
    Agent-style AI search that works in steps:
    1. Analyze user query (intent, keywords, filters)
    2. Find matching categories/professions
    3. Search database with smart filters
    4. AI ranks and explains results
    """

    @staticmethod
    async def search(
        db: AsyncSession,
        query: str,
        role: str,  # "job_seeker" or "candidate_hunter"
        region_id: Optional[int] = None,
        limit: int = 10,
    ) -> dict:
        """
        Main agent search method.
        Returns: {items: [...], summary: str, total: int, search_type: str}
        """
        # ═══ STEP 1: Analyze query with AI ═══
        professions = await db.execute(
            select(Profession).where(Profession.is_active == True)
        )
        all_profs = professions.scalars().all()
        prof_list = [{"id": p.id, "name_uz": p.name_uz, "name_ru": p.name_ru} for p in all_profs]

        regions_result = await db.execute(
            select(Region).where(Region.is_active == True)
        )
        all_regions = regions_result.scalars().all()
        region_list = [{"id": r.id, "name": r.name_uz} for r in all_regions]

        is_employer = role == "candidate_hunter"
        search_target = "ishchilar (resume)" if is_employer else "vakansiyalar"

        analysis_prompt = (
            f"Foydalanuvchi qidiruv so'rovi: \"{query}\"\n"
            f"Foydalanuvchi roli: {'Ish beruvchi (ishchi qidiradi)' if is_employer else 'Ish qidiruvchi (vakansiya qidiradi)'}\n"
            f"Qidiruv maqsadi: {search_target}\n\n"
            f"Mavjud kasblar:\n{json.dumps(prof_list[:80], ensure_ascii=False)}\n\n"
            f"Mavjud hududlar:\n{json.dumps(region_list, ensure_ascii=False)}\n\n"
            "VAZIFA: So'rovni tahlil qilib, qidiruv parametrlarini aniqlang.\n\n"
            "Javob JSON formatda:\n"
            "{\n"
            '  "intent": "so\'rov maqsadi qisqacha",\n'
            '  "profession_ids": [mos kasblar ID lari],\n'
            '  "region_id": hudud ID yoki null,\n'
            '  "keywords": ["kalit", "so\'zlar"],\n'
            '  "min_experience": 0,\n'
            '  "max_experience": null yoki raqam,\n'
            '  "salary_min": null yoki raqam,\n'
            '  "salary_max": null yoki raqam,\n'
            '  "gender_filter": null yoki "male"/"female",\n'
            '  "search_strategy": "profession" yoki "keyword" yoki "both"\n'
            "}\n\n"
            "QOIDALAR:\n"
            "- profession_ids: so'rovga eng mos 1-5 ta kasb ID sini tanlang\n"
            "- Agar aniq kasb topa olmasangiz, yaqin kasblarni ham qo'shing\n"
            "- keywords: qo'shimcha qidiruv uchun kalit so'zlar\n"
            "- region_id: agar so'rovda hudud aytilgan bo'lsa\n"
            "- search_strategy: kasblar topilsa 'profession', topilmasa 'keyword', ikkalasi ham bo'lsa 'both'"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="worker_finder",
                user_message=analysis_prompt,
                temperature=0.1,
            )
            analysis = parse_ai_json(ai_response)
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            # Fallback: simple keyword search
            analysis = {
                "profession_ids": [],
                "keywords": query.split(),
                "search_strategy": "keyword",
            }

        profession_ids = analysis.get("profession_ids", [])
        keywords = analysis.get("keywords", [])
        search_strategy = analysis.get("search_strategy", "both")
        detected_region = analysis.get("region_id") or region_id
        min_exp = analysis.get("min_experience", 0)
        max_exp = analysis.get("max_experience")
        salary_min = analysis.get("salary_min")
        salary_max = analysis.get("salary_max")

        # ═══ STEP 2: Search database ═══
        if is_employer:
            items = await AIAgentSearchService._search_resumes(
                db, profession_ids, keywords, search_strategy,
                detected_region, min_exp, max_exp, limit * 2
            )
        else:
            items = await AIAgentSearchService._search_vacancies(
                db, profession_ids, keywords, search_strategy,
                detected_region, salary_min, salary_max, min_exp, max_exp, limit * 2
            )

        if not items:
            return {
                "items": [],
                "summary": f"'{query}' bo'yicha natija topilmadi. Boshqa so'z bilan qidirib ko'ring.",
                "total": 0,
                "search_type": "vacancy" if not is_employer else "resume",
            }

        # ═══ STEP 3: AI ranks results ═══
        ranked_items = await AIAgentSearchService._rank_results(
            items, query, is_employer, limit
        )

        intent = analysis.get("intent", query)
        search_type = "resume" if is_employer else "vacancy"

        return {
            "items": ranked_items,
            "summary": f"'{intent}' bo'yicha {len(ranked_items)} ta natija topildi",
            "total": len(ranked_items),
            "search_type": search_type,
        }

    @staticmethod
    async def _search_vacancies(
        db: AsyncSession,
        profession_ids: List[int],
        keywords: List[str],
        strategy: str,
        region_id: Optional[int],
        salary_min: Optional[int],
        salary_max: Optional[int],
        min_exp: int,
        max_exp: Optional[int],
        limit: int,
    ) -> list:
        """Search vacancies with smart filters."""
        query = (
            select(Vacancy)
            .where(Vacancy.status == VacancyStatus.ACTIVE)
            .options(
                selectinload(Vacancy.profession),
                selectinload(Vacancy.region),
            )
        )

        conditions = []

        if strategy in ("profession", "both") and profession_ids:
            conditions.append(Vacancy.profession_id.in_(profession_ids))

        if strategy in ("keyword", "both") and keywords:
            keyword_conditions = []
            for kw in keywords[:5]:
                kw_filter = f"%{kw}%"
                keyword_conditions.append(Vacancy.description.ilike(kw_filter))
                keyword_conditions.append(Vacancy.company_name.ilike(kw_filter))
            conditions.append(or_(*keyword_conditions))

        if conditions:
            query = query.where(or_(*conditions))

        if region_id:
            query = query.where(Vacancy.region_id == region_id)

        if salary_min:
            query = query.where(
                or_(Vacancy.salary_from >= salary_min, Vacancy.salary_till >= salary_min)
            )

        result = await db.execute(
            query.order_by(Vacancy.created_at.desc()).limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def _search_resumes(
        db: AsyncSession,
        profession_ids: List[int],
        keywords: List[str],
        strategy: str,
        region_id: Optional[int],
        min_exp: int,
        max_exp: Optional[int],
        limit: int,
    ) -> list:
        """Search resumes with smart filters."""
        query = (
            select(Resume)
            .where(Resume.status == ResumeStatus.ACTIVE)
            .options(
                selectinload(Resume.profession),
                selectinload(Resume.region),
            )
        )

        conditions = []

        if strategy in ("profession", "both") and profession_ids:
            conditions.append(Resume.profession_id.in_(profession_ids))

        if strategy in ("keyword", "both") and keywords:
            keyword_conditions = []
            for kw in keywords[:5]:
                kw_filter = f"%{kw}%"
                keyword_conditions.append(Resume.description.ilike(kw_filter))
                keyword_conditions.append(Resume.first_name.ilike(kw_filter))
                keyword_conditions.append(Resume.last_name.ilike(kw_filter))
            conditions.append(or_(*keyword_conditions))

        if conditions:
            query = query.where(or_(*conditions))

        if region_id:
            query = query.where(Resume.region_id == region_id)
        if min_exp > 0:
            query = query.where(Resume.experience >= min_exp)
        if max_exp:
            query = query.where(Resume.experience <= max_exp)

        result = await db.execute(
            query.order_by(Resume.created_at.desc()).limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def _rank_results(items: list, query: str, is_employer: bool, limit: int) -> list:
        """Rank results using AI and return formatted list."""
        if not items:
            return []

        # Format items for AI ranking
        items_data = []
        for item in items[:20]:  # Limit to 20 for AI context
            if is_employer:
                # Resume
                items_data.append({
                    "id": item.id,
                    "name": f"{item.first_name} {item.last_name}",
                    "profession": item.profession.name_uz if item.profession else "",
                    "experience": item.experience,
                    "region": item.region.name_uz if item.region else "",
                    "age": item.age,
                    "description": item.description[:150] if item.description else "",
                })
            else:
                # Vacancy
                items_data.append({
                    "id": item.id,
                    "title": item.profession.name_uz if item.profession else "",
                    "company": item.company_name,
                    "region": item.region.name_uz if item.region else "",
                    "salary_from": item.salary_from,
                    "salary_till": item.salary_till,
                    "experience": f"{item.exp_from}-{item.exp_till}",
                    "description": item.description[:150] if item.description else "",
                })

        ranking_prompt = (
            f"Qidiruv: \"{query}\"\n\n"
            f"Natijalar:\n{json.dumps(items_data, ensure_ascii=False)}\n\n"
            "Natijalarni moslik darajasi bo'yicha tartiblang (0-100 ball).\n"
            "Faqat 50+ ball olganlarini qaytaring.\n\n"
            "Format:\n"
            '{"ranked": [{"id": N, "score": N, "reason": "qisqa sabab"}]}'
        )

        try:
            ai_response = await ai_chat_completion(
                feature="worker_finder",
                user_message=ranking_prompt,
                temperature=0.1,
            )
            ranking = parse_ai_json(ai_response)
            ranked_ids = ranking.get("ranked", [])
        except Exception as e:
            logger.error(f"AI ranking failed: {e}")
            # Fallback: return items as-is
            ranked_ids = [{"id": item.id, "score": 70, "reason": ""} for item in items[:limit]]

        # Build final results
        item_map = {item.id: item for item in items}
        results = []

        for rank_item in ranked_ids[:limit]:
            item_id = rank_item.get("id")
            item = item_map.get(item_id)
            if not item:
                continue

            score = min(100, max(0, rank_item.get("score", 0)))
            reason = rank_item.get("reason", "")

            if is_employer:
                results.append({
                    "id": item.id,
                    "type": "resume",
                    "title": f"{item.first_name} {item.last_name}",
                    "subtitle": item.profession.name_uz if item.profession else "",
                    "region": item.region.name_uz if item.region else "",
                    "experience": item.experience,
                    "score": score,
                    "reason": reason,
                    "phone": item.phone,
                    "telegram": item.telegram,
                })
            else:
                salary_text = ""
                if item.salary_from and item.salary_till:
                    salary_text = f"{item.salary_from:,} - {item.salary_till:,}".replace(",", " ")
                elif item.salary_from:
                    salary_text = f"{item.salary_from:,}+".replace(",", " ")

                results.append({
                    "id": item.id,
                    "type": "vacancy",
                    "title": item.profession.name_uz if item.profession else item.company_name,
                    "subtitle": item.company_name,
                    "region": item.region.name_uz if item.region else "",
                    "salary": salary_text,
                    "experience": f"{item.exp_from}-{item.exp_till} yil",
                    "score": score,
                    "reason": reason,
                    "phone": item.phone,
                    "telegram": item.telegram,
                })

        return results
