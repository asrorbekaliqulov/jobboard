from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    BOT_TOKEN: str
    TELEGRAM_CHANNEL_IDS: Annotated[list[str], NoDecode] = []

    @field_validator("TELEGRAM_CHANNEL_IDS", mode="before")
    @classmethod
    def _split_channel_ids(cls, v):
        if v is None or v == "":
            return []
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    WEBHOOK_URL: str  # e.g., https://yourdomain.com/webhook
    MINI_APP_URL: str  # e.g., https://your-miniapp-domain.com
    DATABASE_URL: str  # e.g., postgresql+asyncpg://user:pass@db:5432/job_db
    REDIS_URL: str  # e.g., redis://redis:6379/0

    SECRET_KEY: str
    ALGORITHM: str = "HS256"

    # i18n
    I18N_DOMAIN: str = "messages"
    DEFAULT_LOCALE: str = "uz"
    SUPPORTED_LOCALES: list[str] = ["uz", "ru", "en"]

    # Google Cloud Storage (S3-compatible)
    GCS_BUCKET_NAME: str | None = None  # When set, uploads go to GCS instead of local
    GCS_CREDENTIALS_FILE: str | None = (
        None  # Path to service account JSON; else uses GOOGLE_APPLICATION_CREDENTIALS
    )
    GCS_PUBLIC_BASE_URL: str | None = (
        None  # e.g. https://storage.googleapis.com/BUCKET or custom CDN
    )

    class Config:
        env_file = ".env"


settings = Settings()
