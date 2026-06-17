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

    WEBHOOK_URL: str = ""  # Optional: if empty or not https, bot runs in polling mode
    MINI_APP_URL: str = ""  # e.g., https://your-miniapp-domain.com
    DATABASE_URL: str  # e.g., postgresql+asyncpg://user:pass@db:5432/job_db
    REDIS_URL: str = ""  # e.g., redis://redis:6379/0 (optional for polling mode)

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

    # AI / OpenAI Configuration
    OPENAI_API_KEY: str = ""  # OpenAI API key for ChatGPT features
    OPENAI_MODEL: str = "gpt-4o-mini"  # Model to use (cost-effective)
    OPENAI_MAX_TOKENS: int = 2000  # Max tokens per response

    # HeadHunter API Configuration
    HH_API_BASE_URL: str = "https://api.hh.ru"  # HH API (works for Uzbekistan with area=97)
    HH_API_TOKEN: str = ""  # Optional HH API token for higher limits

    @property
    def use_webhook(self) -> bool:
        """Returns True if webhook mode should be used, False for polling."""
        return bool(self.WEBHOOK_URL and self.WEBHOOK_URL.startswith("https://"))

    @property
    def use_redis(self) -> bool:
        """Returns True if Redis URL is configured."""
        return bool(self.REDIS_URL and self.REDIS_URL.strip())

    @property
    def ai_enabled(self) -> bool:
        """Returns True if OpenAI API key is configured."""
        return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY.strip())

    class Config:
        env_file = ".env"


settings = Settings()
