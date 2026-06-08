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
from app.models.location import Region

async def populate_regions():
    # Look for regions.json in the project root
    file_path = os.path.join(project_root, "regions.json")
    if not os.path.exists(file_path):
        print(f"File not found: regions.json (checked {file_path})")
        return

    async with async_session_maker() as session:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        print(f"Found {len(data)} regions to process.")

        for region_data in data:
            # Check if region exists by ID
            stmt = select(Region).where(Region.id == region_data["id"])
            result = await session.execute(stmt)
            region = result.scalar_one_or_none()

            if not region:
                print(f"Creating region: {region_data['name_en']}")
                region = Region(
                    id=region_data["id"],
                    name_uz=region_data["name_uz"],
                    name_ru=region_data["name_ru"],
                    name_en=region_data["name_en"],
                    is_active=True
                )
                session.add(region)
            else:
                print(f"Updating region: {region_data['name_en']}")
                # Update existing region names
                region.name_uz = region_data["name_uz"]
                region.name_ru = region_data["name_ru"]
                region.name_en = region_data["name_en"]

        await session.commit()
        print("Regions population completed successfully.")

if __name__ == "__main__":
    try:
        asyncio.run(populate_regions())
    except Exception as e:
        print(f"An error occurred: {e}")
