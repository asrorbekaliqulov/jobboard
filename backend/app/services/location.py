from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from app.models.location import Region, District
from app.schemas.location import (
    RegionCreate, 
    RegionUpdate, 
    DistrictCreate,
    DistrictUpdate,
)
from typing import List, Optional

class RegionService:
    @staticmethod
    async def get_all(db: AsyncSession, only_active: bool | None = None, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[Region]:
        query = (
            select(Region, func.count(District.id).label("districts_count"))
            .outerjoin(District, Region.id == District.region_id)
            .group_by(Region.id)
        )
        if only_active is not None:
            query = query.where(Region.is_active == only_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Region.name_uz.ilike(search_filter),
                    Region.name_ru.ilike(search_filter),
                    Region.name_en.ilike(search_filter),
                )
            )
        result = await db.execute(query.offset(skip).limit(limit).order_by(Region.id.asc()))
        
        regions = []
        for row in result.all():
            region = row.Region
            region.districts_count = row.districts_count
            regions.append(region)
        return regions

    @staticmethod
    async def count(db: AsyncSession, only_active: bool | None = None, search: Optional[str] = None) -> int:
        query = select(func.count(Region.id))
        if only_active is not None:
            query = query.where(Region.is_active == only_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    Region.name_uz.ilike(search_filter),
                    Region.name_ru.ilike(search_filter),
                    Region.name_en.ilike(search_filter),
                )
            )
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, region_id: int) -> Optional[Region]:
        result = await db.execute(select(Region).where(Region.id == region_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, region_in: RegionCreate) -> Region:
        region = Region(**region_in.model_dump())
        db.add(region)
        await db.commit()
        await db.refresh(region)
        return region

    @staticmethod
    async def update(db: AsyncSession, region: Region, region_in: RegionUpdate) -> Region:
        update_data = region_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(region, field, value)
        await db.commit()
        await db.refresh(region)
        return region

    @staticmethod
    async def delete(db: AsyncSession, region: Region) -> None:
        await db.delete(region)
        await db.commit()

class DistrictService:
    @staticmethod
    async def get_all(db: AsyncSession, region_id: Optional[int] = None, is_active: bool | None = None, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[District]:
        query = select(District).options(selectinload(District.region))
        if region_id:
            query = query.where(District.region_id == region_id)
        if is_active is not None:
            query = query.where(District.is_active == is_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    District.name_uz.ilike(search_filter),
                    District.name_ru.ilike(search_filter),
                    District.name_en.ilike(search_filter),
                )
            )
        result = await db.execute(query.offset(skip).limit(limit).order_by(District.id.asc()))
        return result.scalars().all()

    @staticmethod
    async def count(db: AsyncSession, region_id: Optional[int] = None, is_active: bool | None = None, search: Optional[str] = None) -> int:
        query = select(func.count(District.id))
        if region_id:
            query = query.where(District.region_id == region_id)
        if is_active is not None:
            query = query.where(District.is_active == is_active)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                or_(
                    District.name_uz.ilike(search_filter),
                    District.name_ru.ilike(search_filter),
                    District.name_en.ilike(search_filter),
                )
            )
        result = await db.execute(query)
        return result.scalar_one()

    @staticmethod
    async def get_by_id(db: AsyncSession, district_id: int) -> Optional[District]:
        result = await db.execute(select(District).where(District.id == district_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, district_in: DistrictCreate) -> District:
        district = District(**district_in.model_dump())
        db.add(district)
        await db.commit()
        
        # Optimized re-query with selectinload
        result = await db.execute(
            select(District)
            .where(District.id == district.id)
            .options(selectinload(District.region))
        )
        return result.scalar_one()

    @staticmethod
    async def update(db: AsyncSession, district: District, district_in: DistrictUpdate) -> District:
        update_data = district_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(district, field, value)
        await db.commit()
        
        # Optimized re-query with selectinload
        result = await db.execute(
            select(District)
            .where(District.id == district.id)
            .options(selectinload(District.region))
        )
        return result.scalar_one()

    @staticmethod
    async def delete(db: AsyncSession, district: District) -> None:
        await db.delete(district)
        await db.commit()
