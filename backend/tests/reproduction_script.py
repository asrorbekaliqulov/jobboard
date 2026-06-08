import sys
import asyncio
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timedelta

# --- MOCKING EXTERNAL LIBRARIES ---
# We mock these libraries because they might not be installed in the environment where we run tests.
# Mock sqlalchemy
mock_sqlalchemy = MagicMock()
sys.modules["sqlalchemy"] = mock_sqlalchemy
sys.modules["sqlalchemy.orm"] = MagicMock()
sys.modules["sqlalchemy.ext.asyncio"] = MagicMock()

# Mock redis
mock_redis_module = MagicMock()
sys.modules["redis"] = mock_redis_module
sys.modules["redis.asyncio"] = MagicMock()

# Mock aiogram
mock_aiogram = MagicMock()
sys.modules["aiogram"] = mock_aiogram
sys.modules["aiogram.exceptions"] = MagicMock()
sys.modules["aiogram.utils"] = MagicMock()
sys.modules["aiogram.utils.keyboard"] = MagicMock()
# Mock aiogram.types
sys.modules["aiogram.types"] = MagicMock() 

# Mock pydantic_settings
mock_pydantic_settings = MagicMock()
sys.modules["pydantic_settings"] = mock_pydantic_settings

# Mock fastapi_babel
mock_fastapi_babel = MagicMock()
sys.modules["fastapi_babel"] = mock_fastapi_babel

# --- END MOCKING ---

# Now we can import our service, but we also need to mock internal app imports if they rely on external libs
# However, NotificationService imports `app.core.config`, `app.models.*`
# We need to make sure those can be imported or mocked.

# Let's mock app.core.config
mock_config = MagicMock()
mock_config.settings = MagicMock()
sys.modules["app.core.config"] = mock_config

# Let's mock models
sys.modules["app.models"] = MagicMock()
sys.modules["app.models.user"] = MagicMock()
sys.modules["app.models.vacancy"] = MagicMock()
sys.modules["app.models.resume"] = MagicMock()
sys.modules["app.models.profession"] = MagicMock()
sys.modules["app.models.region"] = MagicMock() # Assuming region model exists based on usage

# Now import the service class directly from file content or just import it 
# But wait, python needs to find 'app'. We are running from backend root, so 'app' is a package.
# We set PYTHONPATH to include backend root.

from app.services.notification import NotificationService

# Mock bot and redis instance
mock_bot = AsyncMock()
mock_redis_instance = AsyncMock()

# Setup Redis mock
mock_redis_instance.get = AsyncMock(return_value=None)
mock_redis_instance.set = AsyncMock()
mock_redis_instance.exists = AsyncMock(return_value=False)

async def test_notification_service():
    service = NotificationService(mock_bot, mock_redis_instance)
    
    # 1. Test _is_notified
    print("Testing _is_notified...")
    
    # Case 1: Not notified
    mock_redis_instance.exists.return_value = False
    exists = await service._is_notified("prefix", 1, 1)
    assert exists is False, f"Expected False, got {exists}"
    
    # Case 2: Notified
    mock_redis_instance.exists.return_value = True
    exists = await service._is_notified("prefix", 1, 1)
    assert exists is True, f"Expected True, got {exists}"
    
    print("... _is_notified passed")

    # 2. Test _mark_as_notified
    print("Testing _mark_as_notified...")
    await service._mark_as_notified("prefix", 1, 1)
    
    call_args = mock_redis_instance.set.call_args
    # call_args might be (key, value, ex=ttl)
    print(f"Called with: {call_args}")
    
    # Verify key format
    expected_key = "prefix:1:1"
    assert call_args[0][0] == expected_key
    # Verify value
    assert call_args[0][1] == "1"
    # Verify TTL
    assert call_args[1]['ex'] == service.NOTIFICATION_TTL
    
    print("... _mark_as_notified passed")

    print("All verification steps passed!")

if __name__ == "__main__":
    asyncio.run(test_notification_service())
