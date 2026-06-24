from fastapi import APIRouter
from . import regions, districts, professions, users, profession_categories, works, userbot

router = APIRouter()

router.include_router(regions.router, prefix="/regions", tags=["Admin Regions"])
router.include_router(districts.router, prefix="/districts", tags=["Admin Districts"])
router.include_router(professions.router, prefix="/professions", tags=["Admin Professions"])
router.include_router(users.router, prefix="/users", tags=["Admin Users"])
router.include_router(profession_categories.router, prefix="/profession-categories", tags=["Admin Profession Categories"])
router.include_router(works.router, prefix="/works", tags=["Admin Works"])
router.include_router(userbot.router, prefix="/userbot", tags=["Admin Userbot"])
