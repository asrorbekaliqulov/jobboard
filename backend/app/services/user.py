from datetime import datetime
from typing import List, Optional

from app.core.config import settings
from app.core.logging_config import logger
from app.models.user import User, UserLanguage, UserRole
from app.schemas.user import UserCreate, UserUpdate
from redis.asyncio import Redis
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession


class UserService:
    def __init__(self, db: AsyncSession, redis: Redis = None):
        self.db = db
        self.redis = redis

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: bool | None = None,
        is_blocked: bool | None = None,
        is_admin: bool | None = None,
    ) -> List[User]:
        query = select(User)

        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if is_blocked is not None:
            query = query.where(User.is_blocked == is_blocked)
        if is_admin is not None:
            query = query.where(User.is_admin == is_admin)

        if search:
            search_filt = f"%{search}%"
            search_conditions = [
                User.first_name.ilike(search_filt),
                User.last_name.ilike(search_filt),
                User.username.ilike(search_filt),
                User.phone.ilike(search_filt),
                User.telegram_id.ilike(search_filt),
            ]
            query = query.where(or_(*search_conditions))

        query = query.offset(skip).limit(limit).order_by(User.id.desc())

        result = await self.db.execute(query)
        return result.scalars().all()

    async def count(
        self,
        search: Optional[str] = None,
        is_active: bool | None = None,
        is_blocked: bool | None = None,
        is_admin: bool | None = None,
    ) -> int:
        from sqlalchemy import func

        query = select(func.count(User.id))

        if is_active is not None:
            query = query.where(User.is_active == is_active)
        if is_blocked is not None:
            query = query.where(User.is_blocked == is_blocked)
        if is_admin is not None:
            query = query.where(User.is_admin == is_admin)

        if search:
            search_filt = f"%{search}%"
            search_conditions = [
                User.first_name.ilike(search_filt),
                User.last_name.ilike(search_filt),
                User.username.ilike(search_filt),
                User.phone.ilike(search_filt),
                User.telegram_id.ilike(search_filt),
            ]
            query = query.where(or_(*search_conditions))

        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_telegram_id(self, telegram_id: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate) -> User:
        user = User(**user_in.model_dump())
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, user_in: UserUpdate) -> User:
        update_data = user_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        await self.db.delete(user)
        await self.db.commit()

    async def update_user_login(self, user: User, add_data: dict | None = None):
        user.is_blocked = False
        user.last_login = datetime.now()
        if add_data:
            for key, value in add_data.items():
                if hasattr(user, key) and value is not None:
                    setattr(user, key, value)
        await self.db.commit()

    async def save_language(self, telegram_id: str, lang: str):
        stmt = (
            update(User)
            .where(User.telegram_id == telegram_id)
            .values(language=UserLanguage(lang))
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def save_contact(self, telegram_id: str, phone: str):
        stmt = update(User).where(User.telegram_id == telegram_id).values(phone=phone)
        await self.db.execute(stmt)
        await self.db.commit()

    async def save_role(self, telegram_id: str, role: UserRole):
        stmt = update(User).where(User.telegram_id == telegram_id).values(role=role)
        await self.db.execute(stmt)
        await self.db.commit()
