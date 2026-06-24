"""
Admin endpoints to manage userbot accounts and monitored channels.

Follows the existing admin pattern (no backend auth dependency — admin gating
is handled on the frontend). All telethon operations are wrapped so missing
dependency / network errors return a clear message instead of crashing.
"""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.userbot import UserbotAccount, UserbotChannel
from app.schemas.userbot import (
    ActionResult,
    UserbotAccountCreate,
    UserbotAccountList,
    UserbotAccountRead,
    UserbotAccountUpdate,
    UserbotChannelCreate,
    UserbotChannelRead,
    UserbotChannelUpdate,
    VerifyCodeRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _get_account(db: AsyncSession, account_id: int) -> UserbotAccount:
    result = await db.execute(
        select(UserbotAccount).where(UserbotAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Userbot account not found")
    return account


# ==================== Accounts ====================
@router.get("/accounts", response_model=UserbotAccountList)
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserbotAccount).order_by(UserbotAccount.id.desc()))
    items = result.scalars().all()
    total = (await db.execute(select(func.count(UserbotAccount.id)))).scalar_one()
    return {"items": items, "total": total}


@router.post("/accounts", response_model=UserbotAccountRead)
async def create_account(payload: UserbotAccountCreate, db: AsyncSession = Depends(get_db)):
    account = UserbotAccount(
        name=payload.name,
        phone=payload.phone.strip(),
        api_id=payload.api_id,
        api_hash=payload.api_hash.strip(),
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    # Re-fetch via select so the selectin 'channels' relationship is loaded
    return await _get_account(db, account.id)


@router.put("/accounts/{account_id}", response_model=UserbotAccountRead)
async def update_account(
    account_id: int, payload: UserbotAccountUpdate, db: AsyncSession = Depends(get_db)
):
    account = await _get_account(db, account_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(account, field, value)
    await db.commit()
    return await _get_account(db, account_id)


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: int, db: AsyncSession = Depends(get_db)):
    account = await _get_account(db, account_id)
    await db.delete(account)
    await db.commit()
    return {"detail": "deleted"}


# ==================== Auth flow ====================
@router.post("/accounts/{account_id}/send-code", response_model=ActionResult)
async def send_code(account_id: int, db: AsyncSession = Depends(get_db)):
    account = await _get_account(db, account_id)
    try:
        from app.services.userbot_manager import send_login_code
        result = await send_login_code(db, account)
        return ActionResult(**result)
    except Exception as e:
        logger.error(f"send-code failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/verify-code", response_model=ActionResult)
async def verify_code(
    account_id: int, payload: VerifyCodeRequest, db: AsyncSession = Depends(get_db)
):
    account = await _get_account(db, account_id)
    try:
        from app.services.userbot_manager import verify_login_code
        result = await verify_login_code(db, account, payload.code, payload.password)
        return ActionResult(**result)
    except Exception as e:
        logger.error(f"verify-code failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/poll", response_model=ActionResult)
async def poll_now(account_id: int, db: AsyncSession = Depends(get_db)):
    """Manually trigger a poll for this account (useful for testing)."""
    account = await _get_account(db, account_id)
    try:
        from app.services.userbot_manager import poll_account
        imported = await poll_account(db, account)
        return ActionResult(
            success=True,
            status=account.status,
            message=f"{imported} ta yangi vakansiya import qilindi.",
        )
    except Exception as e:
        logger.error(f"manual poll failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Channels ====================
@router.get("/accounts/{account_id}/channels", response_model=List[UserbotChannelRead])
async def list_channels(account_id: int, db: AsyncSession = Depends(get_db)):
    await _get_account(db, account_id)
    result = await db.execute(
        select(UserbotChannel)
        .where(UserbotChannel.account_id == account_id)
        .order_by(UserbotChannel.id.desc())
    )
    return result.scalars().all()


@router.post("/accounts/{account_id}/channels", response_model=UserbotChannelRead)
async def add_channel(
    account_id: int, payload: UserbotChannelCreate, db: AsyncSession = Depends(get_db)
):
    await _get_account(db, account_id)
    channel = UserbotChannel(
        account_id=account_id,
        channel_identifier=payload.channel_identifier.strip(),
        keywords=payload.keywords,
        is_active=payload.is_active,
    )
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.put("/channels/{channel_id}", response_model=UserbotChannelRead)
async def update_channel(
    channel_id: int, payload: UserbotChannelUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UserbotChannel).where(UserbotChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(channel, field, value)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.delete("/channels/{channel_id}")
async def delete_channel(channel_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserbotChannel).where(UserbotChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    await db.delete(channel)
    await db.commit()
    return {"detail": "deleted"}
