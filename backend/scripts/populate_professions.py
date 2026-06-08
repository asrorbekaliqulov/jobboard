import asyncio
import json
import sys
import os

# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
# Get the project root (parent of the scripts directory)
project_root = os.path.dirname(script_dir)

# Add project root to sys.path
if project_root not in sys.path:
    sys.path.append(project_root)

from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.profession import Profession, ProfessionCategory

async def populate_data():
    # Look for professions.json in the project root
    file_path = os.path.join(project_root, "professions.json")
    if not os.path.exists(file_path):
        # Fallback for local host execution if running from project root
        file_path = os.path.join(project_root, "backend", "professions.json")
        if not os.path.exists(file_path):
             print(f"File not found: professions.json (checked {os.path.join(project_root, 'professions.json')} and {file_path})")
             return

    async with async_session_maker() as session:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"Found {len(data)} categories to process.")

        for category_data in data:
            # Check if category exists by name_ru
            stmt = select(ProfessionCategory).where(ProfessionCategory.name_ru == category_data["name_ru"])
            result = await session.execute(stmt)
            category = result.scalar_one_or_none()

            if not category:
                print(f"Creating category: {category_data['name_ru']}")
                category = ProfessionCategory(
                    name_ru=category_data["name_ru"],
                    name_en=category_data["name_en"],
                    name_uz=category_data["name_uz"],
                    is_active=True
                )
                session.add(category)
                await session.flush()  # Flush to get the ID for the new category
            else:
                # Update existing category names
                category.name_en = category_data["name_en"]
                category.name_uz = category_data["name_uz"]
                await session.flush()

            if "items" in category_data:
                for item_data in category_data["items"]:
                    stmt_prof = select(Profession).where(Profession.id == item_data["id"])
                    result_prof = await session.execute(stmt_prof)
                    profession = result_prof.scalar_one_or_none()

                    # Use text_ru/en/uz if available, otherwise fallback to text
                    name_ru = item_data.get("text_ru", item_data["text"])
                    name_en = item_data.get("text_en", item_data["text"])
                    name_uz = item_data.get("text_uz", item_data["text"])

                    if not profession:
                        # print(f"  Creating profession: {name_ru} (ID: {item_data['id']})")
                        profession = Profession(
                            id=item_data["id"],
                            name_ru=name_ru,
                            name_en=name_en,
                            name_uz=name_uz,
                            category_id=category.id,
                            is_active=True
                        )
                        session.add(profession)
                    else:
                        # Update existing profession
                        profession.name_ru = name_ru
                        profession.name_en = name_en
                        profession.name_uz = name_uz
                        profession.category_id = category.id

        await session.commit()
        print("Data population completed successfully.")

if __name__ == "__main__":
    try:
        asyncio.run(populate_data())
    except Exception as e:
        print(f"An error occurred: {e}")
