from aiogram import Router, F, types
from aiogram.filters import CommandStart
from aiogram_i18n import I18nContext
from app.bot.keyboards.builders import get_language_kb, get_contact_kb
from app.core.config import settings
from app.core.database import async_session_maker
from app.services.user import UserService
from app.schemas.user import UserCreate
from redis.asyncio import Redis
from app.core.logging_config import logger

router = Router()

def get_services(session):
    redis = Redis.from_url(settings.REDIS_URL)
    return UserService(session, redis)

@router.message(CommandStart())
async def cmd_start(message: types.Message, i18n: I18nContext):
    logger.info(f"Bot command /start: user_id={message.from_user.id}")
    async with async_session_maker() as session:
        user_service = get_services(session)
        user = await user_service.get_user_by_telegram_id(str(message.from_user.id))
        
        first_name = message.from_user.first_name
        last_name = message.from_user.last_name
        username = message.from_user.username

        # Fetch user profile photo
        photo_url = None
        try:
            photos = await message.bot.get_user_profile_photos(message.from_user.id, limit=1)
            if photos.total_count > 0:
                file_id = photos.photos[0][-1].file_id
                file = await message.bot.get_file(file_id)
                photo_url = f"https://api.telegram.org/file/bot{settings.BOT_TOKEN}/{file.file_path}"
        except Exception as e:
            print(f"Error fetching user photo: {e}")

        add_data = {
            "first_name": first_name,
            "last_name": last_name,
            "username": username,
            "photo_url": photo_url
        }

        if user and user.phone:
            await user_service.update_user_login(user, add_data=add_data)
            open_app_kb = types.InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        types.InlineKeyboardButton(
                            text=i18n.get("open_mini_app"),
                            web_app=types.WebAppInfo(url=settings.MINI_APP_URL)
                        )
                    ]
                ]
            )
            name = first_name or last_name or ("@"+username if username else "User")
            await message.answer(
                i18n.get("welcome_back", name=name),
                reply_markup=open_app_kb,
                parse_mode="Markdown"
            )
        else:
            if not user:
                await user_service.create(UserCreate(
                    telegram_id=str(message.from_user.id), 
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    photo_url=photo_url
                ))
            else:
                await user_service.update_user_login(user, add_data=add_data)
            
            await message.answer(
                i18n.get("select_language"),
                reply_markup=get_language_kb()
            )

@router.callback_query(F.data.startswith("lang_"))
async def language_select(callback: types.CallbackQuery, i18n: I18nContext):
    lang = callback.data.split("_")[1]
    logger.info(f"Bot language select: user_id={callback.from_user.id}, lang={lang}")
    
    async with async_session_maker() as session:
        user_service = get_services(session)
        await user_service.save_language(str(callback.from_user.id), lang)
    
    await callback.message.delete()
    
    await i18n.set_locale(lang)
    text = i18n.get("share_contact_request")
    
    await callback.message.answer(
        text,
        reply_markup=get_contact_kb(i18n)
    )
    await callback.answer()

@router.message(F.contact)
async def handle_contact(message: types.Message, i18n: I18nContext):
    contact = message.contact
    logger.info(f"Bot contact shared: user_id={message.from_user.id}")
    
    if contact.user_id != message.from_user.id:
        return await message.answer(i18n.get("share_own_contact"))
 
    async with async_session_maker() as session:
        user_service = get_services(session)
        await user_service.save_contact(str(message.from_user.id), contact.phone_number)

    await message.answer(
        i18n.get("registration_complete"),
        reply_markup=types.ReplyKeyboardRemove()
    )
    
    open_app_kb = types.InlineKeyboardMarkup(
        inline_keyboard=[
            [
                types.InlineKeyboardButton(
                    text=i18n.get("open_mini_app"),
                    web_app=types.WebAppInfo(url=settings.MINI_APP_URL)
                )
            ]
        ]
    )
    
    await message.answer(
        i18n.get("app_description"),
        reply_markup=open_app_kb,
        parse_mode="Markdown"
    )