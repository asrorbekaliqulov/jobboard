from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder
from aiogram.types import InlineKeyboardButton, KeyboardButton


def get_language_kb():
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🇺🇿 O'zbek", callback_data="lang_uz"),
        InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang_ru"),
    )
    return builder.as_markup()

def get_contact_kb(i18n):
    builder = ReplyKeyboardBuilder()
    # Adjust text based on selected language
    text = i18n.get("share_contact_button")
    builder.row(KeyboardButton(text=text, request_contact=True))
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)