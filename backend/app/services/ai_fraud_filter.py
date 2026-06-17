"""
AI Fraud Filter Service
E'lonlarni firibgarlik uchun tekshiradi - shubhali holatlari aniqlaydi.
"""
import json
import logging
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vacancy import Vacancy, VacancyStatus
from app.models.profession import Profession
from app.models.ai_models import AIFraudReport, FraudSeverity
from app.schemas.ai import (
    AIFraudFilterRequest,
    AIFraudFilterResponse,
    FraudIssue,
)
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AIFraudFilterService:
    """Checks job postings for fraud indicators using AI + database rules."""

    @staticmethod
    async def check_posting(
        db: AsyncSession, request: AIFraudFilterRequest, vacancy_id: Optional[int] = None
    ) -> AIFraudFilterResponse:
        """
        Analyzes a job posting for potential fraud.
        Uses both rule-based checks AND AI analysis.
        """
        issues: list[FraudIssue] = []
        
        # === Rule-based checks (no AI needed) ===
        
        # Check 1: Unrealistic salary compared to market
        if request.salary_from or request.salary_till:
            avg_query = select(
                func.avg(Vacancy.salary_from).label("avg_from"),
                func.avg(Vacancy.salary_till).label("avg_till"),
            ).where(
                Vacancy.status == VacancyStatus.ACTIVE,
                Vacancy.salary_from.isnot(None),
            )
            avg_result = await db.execute(avg_query)
            avg_row = avg_result.first()
            
            if avg_row and avg_row[1]:
                market_avg = float(avg_row[1])
                offered = float(request.salary_till or request.salary_from or 0)
                if offered > market_avg * 5 and offered > 20_000_000:
                    issues.append(FraudIssue(
                        issue_type="unrealistic_salary",
                        description=(
                            f"Taklif qilingan maosh ({int(offered):,} so'm) "
                            f"bozor o'rtachasidan ({int(market_avg):,} so'm) juda yuqori."
                        ),
                        severity="high",
                    ))

        # Check 2: Prepayment keywords in description
        prepayment_keywords = [
            "oldindan to'lov", "oldindan pul", "depozit", "ro'yxatdan o'tish puli",
            "qaytarib beramiz", "investitsiya", "MLM", "tarmoqli marketing",
            "predoplata", "depozit", "vlozheniy"
        ]
        desc_lower = request.description.lower()
        for kw in prepayment_keywords:
            if kw in desc_lower:
                issues.append(FraudIssue(
                    issue_type="prepayment_required",
                    description=f"E'londa oldindan pul talab qilish belgilari bor: '{kw}'",
                    severity="critical",
                ))
                break

        # Check 3: Too vague company name
        vague_names = ["kompaniya", "firma", "tashkilot", "kompaniya", "organizatsiya", ""]
        company_name = request.company_name or ""
        if company_name.lower().strip() in vague_names:
            issues.append(FraudIssue(
                issue_type="vague_company",
                description="Kompaniya nomi aniq emas yoki ko'rsatilmagan.",
                severity="medium",
            ))

        # Check 4: No phone number
        if not request.phone or len(request.phone.strip()) < 9:
            issues.append(FraudIssue(
                issue_type="no_phone",
                description="Telefon raqam ko'rsatilmagan yoki noto'g'ri.",
                severity="medium",
            ))

        # === AI-based analysis ===
        nomalum = "Noma'lum"
        phone_display = request.phone or "Yo'q"
        company_display = request.company_name or nomalum
        telegram_display = request.contact_telegram or "Yo'q"
        salary_from_display = str(request.salary_from) if request.salary_from else "N/A"
        salary_till_display = str(request.salary_till) if request.salary_till else "N/A"

        context_for_ai = (
            f"E'lon matni: {request.description}\n"
            f"Maosh: {salary_from_display} - {salary_till_display} so'm\n"
            f"Telefon: {phone_display}\n"
            f"Kompaniya: {company_display}\n"
            f"Telegram: {telegram_display}\n\n"
            f"Oldindan aniqlangan muammolar: {len(issues)} ta\n\n"
            "Qo'shimcha shubhali jihatlarni tekshiring:\n"
            "- Grammatik xatolar va professional emasligi\n"
            "- Haddan tashqari ko'p va'dalar\n"
            "- Noaniq ish tavsifi\n"
            "- Shaxsiy ma'lumotlarni ortiqcha so'rash\n"
            "- Boshqa fraud belgilari\n\n"
            "Javob formati:\n"
            "{\n"
            '  "additional_issues": [\n'
            '    {"issue_type": "...", "description": "...", "severity": "low/medium/high/critical"}\n'
            '  ],\n'
            '  "overall_risk_score": 0-100,\n'
            '  "recommendation": "Foydalanuvchiga maslahat",\n'
            '  "safe_to_apply": true/false\n'
            "}"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="fraud_filter",
                user_message=context_for_ai,
                temperature=0.2,
            )
            ai_result = parse_ai_json(ai_response)

            for issue in ai_result.get("additional_issues", []):
                issues.append(FraudIssue(
                    issue_type=issue.get("issue_type", "ai_detected"),
                    description=issue.get("description", ""),
                    severity=issue.get("severity", "low"),
                ))

            risk_score = ai_result.get("overall_risk_score", 0)
            recommendation = ai_result.get("recommendation", "")
            safe_to_apply = ai_result.get("safe_to_apply", True)

        except Exception as e:
            logger.error(f"AI fraud check failed: {e}")
            risk_score = min(100, len(issues) * 25)
            recommendation = "AI tahlili vaqtincha ishlamayapti, ehtiyot bo'ling."
            safe_to_apply = len(issues) < 2

        # Calculate severity
        severity_map = {"critical": 40, "high": 25, "medium": 15, "low": 5}
        calculated_risk = sum(severity_map.get(i.severity, 5) for i in issues)
        final_risk = max(risk_score, min(100, calculated_risk))

        if final_risk >= 70:
            severity = "critical"
        elif final_risk >= 50:
            severity = "high"
        elif final_risk >= 25:
            severity = "medium"
        else:
            severity = "low"

        # Save report to database
        try:
            fraud_report = AIFraudReport(
                vacancy_id=vacancy_id,
                severity=FraudSeverity(severity),
                risk_score=final_risk,
                issues_detected=[i.model_dump() for i in issues],
                ai_explanation=recommendation,
                analyzed_text=request.description[:500],
                phone_number=request.phone,
            )
            db.add(fraud_report)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to save fraud report: {e}")
            await db.rollback()

        return AIFraudFilterResponse(
            is_suspicious=final_risk >= 30,
            risk_score=final_risk,
            severity=severity,
            issues=issues,
            recommendation=recommendation,
            safe_to_apply=safe_to_apply and final_risk < 50,
        )
