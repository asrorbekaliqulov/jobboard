import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from jose import jwt
from app.core.config import settings

import urllib.parse
from urllib.parse import unquote, parse_qsl

def verify_telegram_init_data(init_data: str) -> Optional[Dict[str, Any]]:
    """
    Verifies the data received from the Telegram Mini App.
    init_data: raw initData from Telegram.WebApp.initData
    """
    try:
        # 1. Parse the query string
        vals = dict(parse_qsl(init_data))
        received_hash = vals.pop('hash', None)
        
        # 2. Create data-check-string (sorted alphabetically)
        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])
    
        # 3. Calculate secret_key
        # HMAC_SHA256("WebAppData", bot_token)
        secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    
        # 4. Calculate final hash
        # HMAC_SHA256(secret_key, data_check_string)
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
        if calculated_hash == received_hash:
            # For JSON parsing, we MUST unquote the 'user' value
            user_data_encoded = vals.get('user')
            if user_data_encoded:
                user_data_str = unquote(user_data_encoded)
                return json.loads(user_data_str)
            return {}
    except Exception as e:
        print(f"Error in verify_telegram_init_data: {e}")
        return None
    return None

def verify_telegram_widget_data(auth_data: dict) -> Optional[dict]:
    """
    Verifies the data received from the Telegram Login Widget.
    auth_data: dictionary of data received from the widget
    """
    try:
        check_data = auth_data.copy()
        received_hash = check_data.pop('hash', None)
        if not received_hash:
            return None
            
        # Create data-check-string
        data_check_list = [f"{k}={v}" for k, v in sorted(check_data.items())]
        data_check_string = "\n".join(data_check_list)
        
        # SHA256 of bot token
        secret_key = hashlib.sha256(settings.BOT_TOKEN.encode()).digest()
        
        # HMAC_SHA256 check
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if calculated_hash == received_hash:
            return check_data
    except Exception as e:
        print(f"Error in verify_telegram_widget_data: {e}")
    return None

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Default expiration: 7 days
        expire = datetime.utcnow() + timedelta(days=7)
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return decoded_token if decoded_token["exp"] >= datetime.utcnow().timestamp() else None
    except Exception:
        return None

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    telegram_id: str = payload.get("sub")
    if telegram_id is None:
        raise credentials_exception
    
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    return user
