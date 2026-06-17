"""
HeadHunter API Integration Service
Fetches vacancies from hh.uz API for additional job listings.
"""
import logging
from typing import Optional, List

import httpx

from app.core.config import settings
from app.schemas.ai import HHVacancyItem, HHVacancyListResponse

logger = logging.getLogger(__name__)

# HH.uz API endpoints
HH_VACANCIES_URL = "/vacancies"
HH_TIMEOUT = 10.0  # seconds


class HeadHunterService:
    """Fetches vacancies from HeadHunter Uzbekistan API."""

    @staticmethod
    async def search_vacancies(
        query: Optional[str] = None,
        region_id: Optional[int] = None,
        page: int = 0,
        per_page: int = 20,
        salary_from: Optional[int] = None,
        salary_to: Optional[int] = None,
        experience: Optional[str] = None,
    ) -> HHVacancyListResponse:
        """
        Search vacancies on HeadHunter.uz
        
        Args:
            query: Search text (job title, keywords)
            region_id: HH region ID (not our internal region_id)
            page: Page number (0-based)
            per_page: Items per page (max 100)
            salary_from: Minimum salary filter
            salary_to: Maximum salary filter
            experience: Experience level ("noExperience", "between1And3", "between3And6", "moreThan6")
        """
        params = {
            "page": page,
            "per_page": min(per_page, 100),
            "area": 97,  # Uzbekistan area ID on HH
            "order_by": "publication_time",
        }

        if query:
            params["text"] = query
        if salary_from:
            params["salary"] = salary_from
        if experience:
            params["experience"] = experience

        headers = {
            "User-Agent": "JobBoard/1.0 (job-board-app)",
        }
        if settings.HH_API_TOKEN:
            headers["Authorization"] = f"Bearer {settings.HH_API_TOKEN}"

        try:
            async with httpx.AsyncClient(
                base_url=settings.HH_API_BASE_URL,
                timeout=HH_TIMEOUT,
            ) as client:
                response = await client.get(
                    HH_VACANCIES_URL,
                    params=params,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

        except httpx.TimeoutException:
            logger.error("HeadHunter API timeout")
            return HHVacancyListResponse(
                items=[], total=0, page=page, per_page=per_page
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"HeadHunter API error: {e.response.status_code}")
            return HHVacancyListResponse(
                items=[], total=0, page=page, per_page=per_page
            )
        except Exception as e:
            logger.error(f"HeadHunter API unexpected error: {e}")
            return HHVacancyListResponse(
                items=[], total=0, page=page, per_page=per_page
            )

        # Parse response
        items = []
        for vacancy in data.get("items", []):
            salary = vacancy.get("salary") or {}
            employer = vacancy.get("employer") or {}
            area = vacancy.get("area") or {}
            experience_data = vacancy.get("experience") or {}
            employment = vacancy.get("employment") or {}
            snippet = vacancy.get("snippet") or {}

            # Build description from snippet
            description_parts = []
            if snippet.get("requirement"):
                description_parts.append(snippet["requirement"])
            if snippet.get("responsibility"):
                description_parts.append(snippet["responsibility"])
            description_short = " | ".join(description_parts)[:300] if description_parts else None

            items.append(HHVacancyItem(
                hh_id=str(vacancy.get("id", "")),
                title=vacancy.get("name", ""),
                company_name=employer.get("name", "Noma'lum"),
                salary_from=salary.get("from"),
                salary_till=salary.get("to"),
                salary_currency=salary.get("currency", "UZS"),
                region=area.get("name"),
                experience=experience_data.get("name"),
                employment_type=employment.get("name"),
                description_short=description_short,
                url=vacancy.get("alternate_url", f"https://hh.uz/vacancy/{vacancy.get('id', '')}"),
                published_at=vacancy.get("published_at"),
                is_from_hh=True,
            ))

        return HHVacancyListResponse(
            items=items,
            total=data.get("found", 0),
            page=data.get("page", page),
            per_page=data.get("per_page", per_page),
        )

    @staticmethod
    async def get_vacancy_detail(vacancy_id: str) -> Optional[dict]:
        """Get detailed info about a specific HH vacancy."""
        headers = {
            "User-Agent": "JobBoard/1.0 (job-board-app)",
        }
        if settings.HH_API_TOKEN:
            headers["Authorization"] = f"Bearer {settings.HH_API_TOKEN}"

        try:
            async with httpx.AsyncClient(
                base_url=settings.HH_API_BASE_URL,
                timeout=HH_TIMEOUT,
            ) as client:
                response = await client.get(
                    f"/vacancies/{vacancy_id}",
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch HH vacancy {vacancy_id}: {e}")
            return None

    @staticmethod
    async def get_similar_vacancies(query: str, limit: int = 10) -> HHVacancyListResponse:
        """Search for similar vacancies on HH based on a query."""
        return await HeadHunterService.search_vacancies(
            query=query,
            per_page=limit,
        )
