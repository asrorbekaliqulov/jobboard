#i18n.py
import os
from fastapi_babel import Babel, BabelConfigs
from aiogram_i18n import I18nMiddleware
from aiogram_i18n.cores.gnu_text_core import GNUTextCore  # If using Gettext

from app.core.config import settings

# Get the path to the backend/app directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCALES_DIR = os.path.join(BASE_DIR, "locales")

# FastAPI Babel configuration
babel_configs = BabelConfigs(
    ROOT_DIR=os.path.join(BASE_DIR, "__init__.py"),
    BABEL_DEFAULT_LOCALE=settings.DEFAULT_LOCALE,
    BABEL_TRANSLATION_DIRECTORY="locales",
    BABEL_DOMAIN=settings.I18N_DOMAIN,
)
babel = Babel(configs=babel_configs)

# aiogram-i18n middleware configuration
i18n_middleware = I18nMiddleware(
    core=GNUTextCore(
        path=LOCALES_DIR,
        default_locale=settings.DEFAULT_LOCALE,
    ),
    default_locale=settings.DEFAULT_LOCALE,
)