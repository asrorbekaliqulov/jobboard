"""
AI Interview Simulator Service
Foydalanuvchini tanlagan kasbi bo'yicha suhbatga tayyorlaydi.
"""
import json
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profession import Profession
from app.models.ai_models import AIInterviewSession, InterviewStatus
from app.schemas.ai import (
    AIInterviewStartRequest,
    AIInterviewStartResponse,
    AIInterviewAnswerRequest,
    AIInterviewAnswerResponse,
    AIInterviewResultResponse,
)
from app.services.ai_core import ai_chat_conversation, ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)

# Number of questions per interview
INTERVIEW_QUESTIONS = 5


class AIInterviewService:
    """AI-powered interview simulator for job seekers."""

    @staticmethod
    async def start_interview(
        db: AsyncSession, request: AIInterviewStartRequest, user_id: int
    ) -> AIInterviewStartResponse:
        """Start a new interview simulation session."""
        
        # Determine profession
        profession_name = request.profession_name
        if request.profession_id:
            result = await db.execute(
                select(Profession).where(Profession.id == request.profession_id)
            )
            profession = result.scalar_one_or_none()
            if profession:
                profession_name = profession.name_uz

        if not profession_name:
            profession_name = "Umumiy"

        # Generate first question
        difficulty_map = {
            "easy": "oson (tajribasiz nomzodlar uchun)",
            "medium": "o'rtacha (1-3 yil tajribali nomzodlar uchun)",
            "hard": "qiyin (senior darajadagi nomzodlar uchun)",
        }
        diff_text = difficulty_map.get(request.difficulty, difficulty_map["medium"])

        messages = [
            {
                "role": "user",
                "content": (
                    f"Men {profession_name} kasbi bo'yicha intervyuga tayyorlanmoqchiman.\n"
                    f"Qiyinlik darajasi: {diff_text}\n"
                    f"Jami {INTERVIEW_QUESTIONS} ta savol berasan.\n\n"
                    f"O'zingni tanishtir (1-2 jumla) va birinchi savolni ber.\n"
                    f"Savollar O'zbekiston bozoriga mos bo'lsin."
                ),
            }
        ]

        ai_response = await ai_chat_conversation(
            feature="interview_simulator",
            messages=messages,
            temperature=0.6,
        )

        # Create session in database
        session = AIInterviewSession(
            user_id=user_id,
            profession_id=request.profession_id,
            status=InterviewStatus.IN_PROGRESS,
            conversation=[
                {"role": "user", "content": messages[0]["content"]},
                {"role": "assistant", "content": ai_response},
            ],
            questions_asked=1,
            questions_answered=0,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Parse intro and question
        parts = ai_response.split("\n", 1)
        intro = parts[0] if parts else ""
        question = parts[1] if len(parts) > 1 else ai_response

        return AIInterviewStartResponse(
            session_id=session.id,
            first_question=ai_response,
            interviewer_intro=f"Assalomu alaykum! Men {profession_name} bo'yicha HR menejeriman.",
            total_questions=INTERVIEW_QUESTIONS,
        )

    @staticmethod
    async def answer_question(
        db: AsyncSession, request: AIInterviewAnswerRequest, user_id: int
    ) -> AIInterviewAnswerResponse:
        """Process an answer and return feedback + next question."""
        
        # Get session
        result = await db.execute(
            select(AIInterviewSession).where(
                AIInterviewSession.id == request.session_id,
                AIInterviewSession.user_id == user_id,
                AIInterviewSession.status == InterviewStatus.IN_PROGRESS,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Intervyu sessiyasi topilmadi yoki yakunlangan")

        # Build conversation history
        conversation = session.conversation or []
        conversation.append({"role": "user", "content": request.answer})

        # Determine if this is the last question
        session.questions_answered += 1
        is_last = session.questions_answered >= INTERVIEW_QUESTIONS

        if is_last:
            # Final evaluation
            eval_prompt = (
                f"Nomzodning javobini baholab, intervyuni yakunla.\n"
                f"Umumiy baho ber (0-100 ball).\n"
                f"Kuchli tomonlari va kamchiliklarini ayt.\n"
                f"O'zbek tilida javob ber."
            )
            conversation.append({"role": "user", "content": eval_prompt})
        else:
            # Ask for feedback and next question
            next_prompt = (
                f"Javobni qisqacha (1-2 jumla) baholab, keyingi savolni ber.\n"
                f"Bu {session.questions_answered}/{INTERVIEW_QUESTIONS}-savol edi."
            )
            conversation.append({"role": "user", "content": next_prompt})

        # Get AI response
        ai_messages = []
        for msg in conversation:
            if msg["role"] in ("user", "assistant"):
                ai_messages.append(msg)

        ai_response = await ai_chat_conversation(
            feature="interview_simulator",
            messages=ai_messages,
            temperature=0.5,
        )

        # Update conversation (remove the instruction prompts, keep AI response)
        # Remove the instruction message we added
        conversation.pop()
        conversation.append({"role": "assistant", "content": ai_response})

        session.conversation = conversation
        session.questions_asked = min(session.questions_asked + 1, INTERVIEW_QUESTIONS + 1)

        if is_last:
            session.status = InterviewStatus.COMPLETED
            # Try to extract score from response
            try:
                if any(char.isdigit() for char in ai_response):
                    import re
                    scores = re.findall(r'\b(\d{1,3})\b', ai_response)
                    for s in scores:
                        if 0 <= int(s) <= 100:
                            session.overall_score = int(s)
                            break
            except Exception:
                session.overall_score = 70  # Default

        await db.commit()

        return AIInterviewAnswerResponse(
            feedback=ai_response,
            next_question=None if is_last else ai_response,
            is_completed=is_last,
            current_score=session.overall_score,
        )

    @staticmethod
    async def get_results(
        db: AsyncSession, session_id: int, user_id: int
    ) -> AIInterviewResultResponse:
        """Get final interview results."""
        
        result = await db.execute(
            select(AIInterviewSession).where(
                AIInterviewSession.id == session_id,
                AIInterviewSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Intervyu sessiyasi topilmadi")

        if session.status != InterviewStatus.COMPLETED:
            raise ValueError("Intervyu hali yakunlanmagan")

        # Generate detailed results using AI
        conversation_text = ""
        for msg in (session.conversation or []):
            role = "Nomzod" if msg["role"] == "user" else "HR"
            conversation_text += f"{role}: {msg['content']}\n"

        prompt = (
            f"Quyidagi intervyu natijalarini tahlil qiling:\n\n"
            f"{conversation_text[:3000]}\n\n"
            f"Javob JSON formatda:\n"
            f"{{\n"
            f'  "overall_score": 0-100,\n'
            f'  "strengths": ["kuchli tomon 1", "kuchli tomon 2"],\n'
            f'  "weaknesses": ["kamchilik 1", "kamchilik 2"],\n'
            f'  "recommendations": ["tavsiya 1", "tavsiya 2"],\n'
            f'  "detailed_feedback": "Batafsil fikr"\n'
            f"}}"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="interview_simulator",
                user_message=prompt,
                temperature=0.3,
            )
            ai_result = parse_ai_json(ai_response)
        except Exception as e:
            logger.error(f"AI interview results failed: {e}")
            ai_result = {
                "overall_score": session.overall_score or 70,
                "strengths": ["Intervyuga qatnashganingiz uchun rahmat"],
                "weaknesses": ["Batafsil tahlil vaqtincha mavjud emas"],
                "recommendations": ["Mashq qilishda davom eting"],
                "detailed_feedback": "AI tahlili vaqtincha ishlamayapti",
            }

        return AIInterviewResultResponse(
            session_id=session.id,
            overall_score=ai_result.get("overall_score", session.overall_score or 70),
            strengths=ai_result.get("strengths", []),
            weaknesses=ai_result.get("weaknesses", []),
            recommendations=ai_result.get("recommendations", []),
            detailed_feedback=ai_result.get("detailed_feedback", ""),
        )
