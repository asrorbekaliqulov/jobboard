"""
AI Company Trust Service
Ish beruvchilar ishonchliligini boshqaradi va baholaydi.
Alohida bazada saqlanadi - eski bazaga ta'sir qilmaydi.
"""
import logging
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_models import (
    EmployerTrustRating,
    EmployerReview,
    TrustLevel,
)
from app.models.user import User
from app.models.vacancy import Vacancy, VacancyStatus
from app.schemas.ai import (
    AICompanyTrustRequest,
    AICompanyTrustResponse,
    AICompanyReviewRequest,
    AICompanyReviewResponse,
)
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AICompanyTrustService:
    """Manages employer trust ratings and reviews."""

    @staticmethod
    async def get_trust_info(
        db: AsyncSession, request: AICompanyTrustRequest
    ) -> AICompanyTrustResponse:
        """Get company trust rating and summary."""
        
        # Find the trust rating record
        query = select(EmployerTrustRating)
        if request.employer_user_id:
            query = query.where(
                EmployerTrustRating.employer_user_id == request.employer_user_id
            )
        elif request.company_name:
            query = query.where(
                EmployerTrustRating.company_name.ilike(f"%{request.company_name}%")
            )
        else:
            raise ValueError("employer_user_id yoki company_name kerak")

        result = await db.execute(query)
        trust_rating = result.scalar_one_or_none()

        if not trust_rating:
            # Company not yet rated - create info from vacancies
            company_name = request.company_name or ""
            if request.employer_user_id and not company_name:
                vac_result = await db.execute(
                    select(Vacancy.company_name)
                    .where(Vacancy.user_id == request.employer_user_id)
                    .limit(1)
                )
                row = vac_result.first()
                if row:
                    company_name = row[0]

            # Count their vacancies
            vac_count = 0
            if request.employer_user_id:
                vac_count_result = await db.execute(
                    select(func.count(Vacancy.id)).where(
                        Vacancy.user_id == request.employer_user_id,
                        Vacancy.status == VacancyStatus.ACTIVE,
                    )
                )
                vac_count = vac_count_result.scalar_one() or 0

            display_name = company_name or "Noma'lum kompaniya"
            return AICompanyTrustResponse(
                company_name=display_name,
                overall_score=0.0,
                trust_level="average",
                total_reviews=0,
                total_vacancies=vac_count,
                salary_punctuality=0.0,
                working_conditions=0.0,
                communication=0.0,
                is_verified=False,
                has_complaints=False,
                ai_summary="Bu kompaniya haqida hali baho yo'q. Birinchi bo'lib baho qoldiring!",
            )

        # Get recent reviews for AI summary
        reviews_result = await db.execute(
            select(EmployerReview)
            .where(EmployerReview.employer_trust_id == trust_rating.id)
            .order_by(EmployerReview.created_at.desc())
            .limit(10)
        )
        reviews = reviews_result.scalars().all()

        # Generate AI summary
        ai_summary = ""
        if reviews:
            review_lines = []
            for r in reviews[:5]:
                comment = r.comment or "Yo'q"
                review_lines.append(f"- Baho: {r.overall}/5, Izoh: {comment}")
            reviews_text = "\n".join(review_lines)

            try:
                prompt = (
                    f"Kompaniya: {trust_rating.company_name}\n"
                    f"Umumiy baho: {trust_rating.overall_score:.1f}/5\n"
                    f"Jami baholar: {trust_rating.total_reviews} ta\n"
                    f"Oxirgi baholar:\n{reviews_text}\n\n"
                    "1-2 jumlada qisqa xulosa yozing. Faqat berilgan ma'lumotlar asosida.\n"
                    'Format: {"summary": "..."}'
                )
                ai_response = await ai_chat_completion(
                    feature="company_trust",
                    user_message=prompt,
                    temperature=0.3,
                )
                ai_result = parse_ai_json(ai_response)
                ai_summary = ai_result.get("summary", "")
            except Exception as e:
                logger.error(f"AI summary generation failed: {e}")
                ai_summary = (
                    f"Umumiy baho: {trust_rating.overall_score:.1f}/5 "
                    f"({trust_rating.total_reviews} ta baho asosida)"
                )
        else:
            ai_summary = "Kompaniya ro'yxatda, lekin hali baho yo'q."

        return AICompanyTrustResponse(
            company_name=trust_rating.company_name,
            overall_score=trust_rating.overall_score,
            trust_level=trust_rating.trust_level.value,
            total_reviews=trust_rating.total_reviews,
            total_vacancies=trust_rating.total_vacancies_posted,
            salary_punctuality=trust_rating.salary_punctuality_score,
            working_conditions=trust_rating.working_conditions_score,
            communication=trust_rating.communication_score,
            is_verified=trust_rating.is_verified,
            has_complaints=trust_rating.has_salary_complaints or trust_rating.has_condition_complaints,
            ai_summary=ai_summary,
        )

    @staticmethod
    async def add_review(
        db: AsyncSession, request: AICompanyReviewRequest, reviewer_user_id: int
    ) -> AICompanyReviewResponse:
        """Add a review for an employer and recalculate their trust score."""
        
        # Find or create trust rating
        result = await db.execute(
            select(EmployerTrustRating).where(
                EmployerTrustRating.employer_user_id == request.employer_user_id
            )
        )
        trust_rating = result.scalar_one_or_none()

        if not trust_rating:
            # Count employer's vacancies
            vac_count_result = await db.execute(
                select(func.count(Vacancy.id)).where(
                    Vacancy.user_id == request.employer_user_id
                )
            )
            vac_count = vac_count_result.scalar_one() or 0

            trust_rating = EmployerTrustRating(
                employer_user_id=request.employer_user_id,
                company_name=request.company_name,
                total_vacancies_posted=vac_count,
            )
            db.add(trust_rating)
            await db.flush()

        # Add the review
        review = EmployerReview(
            employer_trust_id=trust_rating.id,
            reviewer_user_id=reviewer_user_id,
            salary_punctuality=request.salary_punctuality,
            working_conditions=request.working_conditions,
            communication=request.communication,
            overall=request.overall,
            comment=request.comment,
            is_anonymous=request.is_anonymous,
        )
        db.add(review)

        # Recalculate averages
        avg_result = await db.execute(
            select(
                func.avg(EmployerReview.salary_punctuality),
                func.avg(EmployerReview.working_conditions),
                func.avg(EmployerReview.communication),
                func.avg(EmployerReview.overall),
                func.count(EmployerReview.id),
            ).where(EmployerReview.employer_trust_id == trust_rating.id)
        )
        avg_row = avg_result.first()

        if avg_row:
            trust_rating.salary_punctuality_score = float(avg_row[0] or 0)
            trust_rating.working_conditions_score = float(avg_row[1] or 0)
            trust_rating.communication_score = float(avg_row[2] or 0)
            trust_rating.overall_score = float(avg_row[3] or 0)
            trust_rating.total_reviews = int(avg_row[4] or 0)

            # Determine trust level
            score = trust_rating.overall_score
            if score >= 4.5:
                trust_rating.trust_level = TrustLevel.EXCELLENT
            elif score >= 3.5:
                trust_rating.trust_level = TrustLevel.GOOD
            elif score >= 2.5:
                trust_rating.trust_level = TrustLevel.AVERAGE
            elif score >= 1.5:
                trust_rating.trust_level = TrustLevel.POOR
            else:
                trust_rating.trust_level = TrustLevel.DANGEROUS

            # Set complaint flags
            trust_rating.has_salary_complaints = trust_rating.salary_punctuality_score < 2.5
            trust_rating.has_condition_complaints = trust_rating.working_conditions_score < 2.5

        await db.commit()

        return AICompanyReviewResponse(
            review_id=review.id,
            message="Bahoyingiz muvaffaqiyatli qo'shildi! Rahmat!",
            updated_score=trust_rating.overall_score,
        )
