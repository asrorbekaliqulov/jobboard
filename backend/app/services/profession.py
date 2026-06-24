from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.models.profession import Profession
from app.schemas.profession import ProfessionCreate, ProfessionUpdate
from typing import List, Optional


class ProfessionService:
    @staticmethod
    async def get_all(db: AsyncSession, only_active: bool | None = None, search: Optional[str] = None, skip: int = 0, limit: int = 100, parent_id: Optional[int] = None, top_level_only: bool = False) -> List[Profession]:
        query = select(Profession).options(selectinload(Profession.children))
        if only_active is not None:
            query = query.where(Profession.is_active == only_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )
        if parent_id is not None:
            query = query.where(Profession.parent_id == parent_id)
        elif top_level_only:
            query = query.where(Profession.parent_id.is_(None))
        result = await db.execute(query.offset(skip).limit(limit).order_by(Profession.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def get_tree(db: AsyncSession, only_active: bool | None = None) -> List["ProfessionWithChildren"]:
        """Build a robust 2-level tree from ALL professions.

        Every profession is guaranteed to appear: each one is attached to its
        top-most ancestor (walking up parent_id). Deeper hierarchies are
        flattened to fit the 2-level schema, and orphans (parent missing or
        inactive) become top-level. Builds plain schema objects so the ORM
        relationship is never mutated (no accidental re-parenting on commit).
        """
        from app.schemas.profession import ProfessionRead, ProfessionWithChildren

        query = select(Profession)
        if only_active is not None:
            query = query.where(Profession.is_active == only_active)
        result = await db.execute(query.order_by(Profession.id.asc()))
        all_profs = result.scalars().all()

        by_id = {p.id: p for p in all_profs}

        def top_ancestor(prof):
            seen = set()
            cur = prof
            while cur.parent_id and cur.parent_id in by_id and cur.id not in seen:
                seen.add(cur.id)
                cur = by_id[cur.parent_id]
            return cur

        def to_read(p) -> "ProfessionRead":
            return ProfessionRead(
                id=p.id, name_uz=p.name_uz, name_ru=p.name_ru,
                name_en=p.name_en, is_active=p.is_active, parent_id=p.parent_id,
            )

        children_map: dict[int, list] = {}
        top_ids: list[int] = []
        for p in all_profs:
            anc = top_ancestor(p)
            if anc.id == p.id:
                top_ids.append(p.id)
            else:
                children_map.setdefault(anc.id, []).append(p)

        roots: List[ProfessionWithChildren] = []
        for tid in top_ids:
            top = by_id[tid]
            kids = sorted(children_map.get(tid, []), key=lambda c: c.name_uz.lower())
            node = ProfessionWithChildren(
                id=top.id, name_uz=top.name_uz, name_ru=top.name_ru,
                name_en=top.name_en, is_active=top.is_active,
                parent_id=top.parent_id,
                children=[to_read(c) for c in kids],
            )
            roots.append(node)
        return roots

    @staticmethod
    async def count(db: AsyncSession, only_active: bool | None = None, search: Optional[str] = None, parent_id: Optional[int] = None, top_level_only: bool = False) -> int:
        query = select(func.count(Profession.id))
        if only_active is not None:
            query = query.where(Profession.is_active == only_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Profession.name_uz.ilike(search_filter),
                    Profession.name_ru.ilike(search_filter),
                    Profession.name_en.ilike(search_filter),
                )
            )
        if parent_id is not None:
            query = query.where(Profession.parent_id == parent_id)
        elif top_level_only:
            query = query.where(Profession.parent_id.is_(None))
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, profession_id: int) -> Optional[Profession]:
        result = await db.execute(
            select(Profession).where(Profession.id == profession_id).options(selectinload(Profession.children))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, profession_in: ProfessionCreate) -> Profession:
        profession = Profession(**profession_in.model_dump())
        db.add(profession)
        await db.commit()
        await db.refresh(profession)
        return profession

    @staticmethod
    async def update(db: AsyncSession, profession: Profession, profession_in: ProfessionUpdate) -> Profession:
        update_data = profession_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profession, field, value)
        await db.commit()
        await db.refresh(profession)
        return profession

    @staticmethod
    async def delete(db: AsyncSession, profession: Profession) -> None:
        await db.delete(profession)
        await db.commit()
