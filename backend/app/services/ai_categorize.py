"""
AI Auto-Categorize Professions Service
Bazadagi kasblarni avtomatik parent-child ierarxiyaga saralaydi.
- AI kasblarni guruhlaydi
- Har bir guruh uchun parent yaratadi (agar yo'q bo'lsa)
- Faqat parent_id ni o'zgartiradi, hech narsa o'chirmaydi
- Preview va Apply rejimida ishlaydi
"""
import json
import logging
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from app.models.profession import Profession
from app.services.ai_core import ai_chat_completion, parse_ai_json

logger = logging.getLogger(__name__)


class AICategorizeService:
    """AI-powered profession categorization."""

    @staticmethod
    async def generate_categories(db: AsyncSession) -> dict:
        """
        Step 1: AI analyzes all professions and generates parent-child grouping.
        Returns preview data (does NOT apply changes).
        """
        # Get all professions
        result = await db.execute(
            select(Profession).where(Profession.is_active == True)
        )
        all_profs = result.scalars().all()

        if not all_profs:
            return {"groups": [], "error": "Kasblar topilmadi"}

        # Prepare data for AI
        profs_data = [
            {"id": p.id, "name_uz": p.name_uz, "name_ru": p.name_ru, "parent_id": p.parent_id}
            for p in all_profs
        ]

        prompt = (
            f"Quyidagi kasblar ro'yxatini mantiqiy kategoriyalarga ajrating.\n\n"
            f"Kasblar ({len(profs_data)} ta):\n"
            f"{json.dumps(profs_data, ensure_ascii=False)}\n\n"
            "VAZIFA:\n"
            "1. Kasblarni mantiqiy guruhlarga ajrating (masalan: IT, Tibbiyot, Ta'lim, Qurilish...)\n"
            "2. Har bir guruh uchun PARENT kasb tanlang yoki yangi nom bering\n"
            "3. Agar bazada shu guruhga mos parent bor bo'lsa - o'shani ishlating\n"
            "4. Agar yo'q bo'lsa - yangi parent nomi bering\n"
            "5. Hech qanday kasbni o'chirmang, faqat guruhlang\n\n"
            "MUHIM QOIDALAR:\n"
            "- BARCHA kasblarni guruhlang! Birontasini ham tashlab ketmang!\n"
            "- Har bir kasb faqat BITTA guruhga tegishli bo'lishi kerak\n"
            "- Umumiy kasblar (masalan 'Boshqa') parent bo'lmasin\n"
            "- Parent nomi guruhni aniq ifodalashi kerak\n"
            "- Agar kasb allaqachon to'g'ri parent_id ga ega bo'lsa, o'zgartirmang\n"
            "- Agar qaysi guruhga kirishini bilmasangiz 'Boshqa xizmatlar' guruhiga qo'shing\n\n"
            "Javob formati:\n"
            "{\n"
            '  "groups": [\n'
            '    {\n'
            '      "parent_name_uz": "IT va Dasturlash",\n'
            '      "parent_name_ru": "IT и Программирование",\n'
            '      "parent_name_en": "IT & Programming",\n'
            '      "parent_existing_id": null yoki mavjud ID,\n'
            '      "children_ids": [1, 5, 12, 34]\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        try:
            ai_response = await ai_chat_completion(
                feature="career_advisor",
                user_message=prompt,
                temperature=0.2,
                max_tokens=4000,
            )
            result_data = parse_ai_json(ai_response)
        except Exception as e:
            logger.error(f"AI categorization failed: {e}")
            return {"groups": [], "error": f"AI xatolik: {str(e)}"}

        groups = result_data.get("groups", [])

        # Find uncategorized professions and add them to "Boshqa" group
        all_categorized_ids = set()
        for group in groups:
            all_categorized_ids.update(group.get("children_ids", []))

        uncategorized = [p for p in all_profs if p.id not in all_categorized_ids]
        if uncategorized:
            groups.append({
                "parent_name_uz": "Boshqa xizmatlar",
                "parent_name_ru": "Прочие услуги",
                "parent_name_en": "Other Services",
                "parent_existing_id": None,
                "children_ids": [p.id for p in uncategorized],
            })

        # Enrich with current profession names for preview
        prof_map = {p.id: p for p in all_profs}
        enriched_groups = []

        for group in groups:
            children_details = []
            for child_id in group.get("children_ids", []):
                prof = prof_map.get(child_id)
                if prof:
                    children_details.append({
                        "id": prof.id,
                        "name_uz": prof.name_uz,
                        "name_ru": prof.name_ru,
                        "current_parent_id": prof.parent_id,
                    })

            enriched_groups.append({
                "parent_name_uz": group.get("parent_name_uz", ""),
                "parent_name_ru": group.get("parent_name_ru", ""),
                "parent_name_en": group.get("parent_name_en", ""),
                "parent_existing_id": group.get("parent_existing_id"),
                "children": children_details,
                "children_count": len(children_details),
            })

        return {
            "groups": enriched_groups,
            "total_professions": len(all_profs),
            "total_groups": len(enriched_groups),
            "error": None,
        }

    @staticmethod
    async def apply_categories(db: AsyncSession, groups: list) -> dict:
        """
        Step 2: Apply the categorization (admin confirmed).
        Creates new parents if needed, updates parent_id for children.
        Returns summary of changes.
        """
        # Fix PostgreSQL sequence (prevents duplicate key errors)
        try:
            await db.execute(
                select(func.setval(
                    'professions_id_seq',
                    select(func.max(Profession.id)).scalar_subquery()
                ))
            )
        except Exception:
            pass  # Non-critical, sequence might already be correct

        changes_made = 0
        parents_created = 0
        errors = []

        for group in groups:
            parent_id = group.get("parent_existing_id")

            # Create parent if doesn't exist
            if not parent_id:
                try:
                    # Check if profession with this name already exists
                    existing = await db.execute(
                        select(Profession).where(
                            Profession.name_uz == group.get("parent_name_uz", "")
                        )
                    )
                    existing_prof = existing.scalar_one_or_none()
                    if existing_prof:
                        parent_id = existing_prof.id
                    else:
                        new_parent = Profession(
                            name_uz=group.get("parent_name_uz", "Boshqa"),
                            name_ru=group.get("parent_name_ru", "Другое"),
                            name_en=group.get("parent_name_en", "Other"),
                            is_active=True,
                            parent_id=None,
                        )
                        db.add(new_parent)
                        await db.flush()
                        parent_id = new_parent.id
                        parents_created += 1
                except Exception as e:
                    await db.rollback()
                    errors.append(f"Parent: {group.get('parent_name_uz')}: {e}")
                    continue

            # Update children's parent_id
            children_ids = [c["id"] for c in group.get("children", [])]
            if children_ids and parent_id:
                try:
                    # Don't set parent_id to itself
                    valid_children = [cid for cid in children_ids if cid != parent_id]
                    if valid_children:
                        await db.execute(
                            update(Profession)
                            .where(Profession.id.in_(valid_children))
                            .values(parent_id=parent_id)
                        )
                        changes_made += len(valid_children)
                except Exception as e:
                    errors.append(f"Children yangilashda xato: {e}")

        try:
            await db.commit()
        except Exception as e:
            await db.rollback()
            return {
                "success": False,
                "error": f"Bazaga saqlashda xato: {str(e)}",
                "changes_made": 0,
            }

        return {
            "success": True,
            "changes_made": changes_made,
            "parents_created": parents_created,
            "errors": errors,
        }

    @staticmethod
    async def revert_categories(db: AsyncSession) -> dict:
        """
        Revert: Set all parent_id to NULL (remove all grouping).
        Only removes parent_id, does NOT delete any profession.
        """
        try:
            await db.execute(
                update(Profession).values(parent_id=None)
            )
            await db.commit()
            return {"success": True, "message": "Barcha kategoriyalar bekor qilindi"}
        except Exception as e:
            await db.rollback()
            return {"success": False, "error": str(e)}
