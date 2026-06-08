"""
Seed daily work types from daily_works.txt into the database.

The txt file has one Uzbek work name per line.
Russian and English translations are embedded in this script.
Matching for updates is done by name_uz (exact match).

Usage (from inside the backend container or with venv active):
    python scripts/seed_works.py
    python scripts/seed_works.py --txt /path/to/daily_works.txt
    python scripts/seed_works.py --dry-run
"""
import asyncio
import os
import sys
import argparse

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.daily_job_seeker import Work

# Translations keyed by the exact Uzbek name from daily_works.txt
# Format: "name_uz": ("name_ru", "name_en")
TRANSLATIONS: dict[str, tuple[str, str]] = {
    "Mardikor (qurilish yordamchisi)": (
        "Разнорабочий (помощник строителя)",
        "General Laborer (Construction Helper)",
    ),
    "Yuk tashuvchi (yukchi)": (
        "Грузчик (носильщик)",
        "Porter / Loader",
    ),
    "Qurilish ishchisi": (
        "Строительный рабочий",
        "Construction Worker",
    ),
    "Beton quyuvchi": (
        "Бетонщик",
        "Concrete Pourer",
    ),
    "Gʻisht teruvchi": (
        "Каменщик",
        "Bricklayer",
    ),
    "Suvoqchi": (
        "Штукатур",
        "Plasterer",
    ),
    "Boʻyoqchi": (
        "Маляр",
        "Painter",
    ),
    "Kafel teruvchi": (
        "Плиточник",
        "Tile Layer",
    ),
    "Santexnik yordamchisi": (
        "Помощник сантехника",
        "Plumber's Assistant",
    ),
    "Elektrik yordamchisi": (
        "Помощник электрика",
        "Electrician's Assistant",
    ),
    "Tom yopuvchi": (
        "Кровельщик",
        "Roofer",
    ),
    "Metall kesuvchi / payvandchi yordamchisi": (
        "Резчик металла / помощник сварщика",
        "Metal Cutter / Welder's Assistant",
    ),
    "Bogʻ ishchisi": (
        "Садовник",
        "Gardener",
    ),
    "Daraxt kesuvchi": (
        "Древорубщик",
        "Tree Trimmer",
    ),
    "Hovli tozalovchi": (
        "Уборщик двора",
        "Yard Cleaner",
    ),
    "Koʻcha supuruvchi": (
        "Дворник",
        "Street Sweeper",
    ),
    "Qor tozalovchi": (
        "Уборщик снега",
        "Snow Remover",
    ),
    "Mebel tashuvchi": (
        "Грузчик мебели",
        "Furniture Mover",
    ),
    "Bozor yukchisi": (
        "Носильщик на рынке",
        "Market Porter",
    ),
    "Dehqonchilik ishchisi (ekish / chopiq)": (
        "Сельскохозяйственный рабочий (посев / прополка)",
        "Farm Worker (Planting / Weeding)",
    ),
    "Hosil teruvchi": (
        "Сборщик урожая",
        "Harvest Picker",
    ),
    "Issiqxona ishchisi": (
        "Работник теплицы",
        "Greenhouse Worker",
    ),
    "Chorva boqish yordamchisi": (
        "Помощник скотовода",
        "Livestock Care Assistant",
    ),
    "Avtomobil yuvuvchi": (
        "Автомойщик",
        "Car Washer",
    ),
    "Avtomobil ustasi yordamchisi": (
        "Помощник автомеханика",
        "Auto Mechanic's Assistant",
    ),
    "Oshxona yordamchisi": (
        "Помощник повара",
        "Kitchen Helper",
    ),
    "Idish yuvuvchi": (
        "Посудомойщик",
        "Dishwasher",
    ),
    "Ofitsiant yordamchisi": (
        "Помощник официанта",
        "Waiter's Assistant",
    ),
    "Kafe / restoran tozalovchisi": (
        "Уборщик кафе / ресторана",
        "Cafe / Restaurant Cleaner",
    ),
    "Reklama varaqasi tarqatuvchi": (
        "Распространитель рекламных листовок",
        "Flyer Distributor",
    ),
}


def read_txt(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


async def seed_works(txt_path: str, dry_run: bool = False) -> None:
    if not os.path.exists(txt_path):
        print(f"ERROR: File not found: {txt_path}")
        sys.exit(1)

    names_uz = read_txt(txt_path)
    print(f"Found {len(names_uz)} work types in txt file.")

    # Warn about any names missing from the translation table
    missing = [n for n in names_uz if n not in TRANSLATIONS]
    if missing:
        print(f"WARNING: {len(missing)} name(s) have no translation entry:")
        for m in missing:
            print(f"  - {m!r}")

    async with async_session_maker() as session:
        # Load existing works indexed by name_uz for fast lookup
        result = await session.execute(select(Work))
        existing_works: dict[str, Work] = {w.name_uz: w for w in result.scalars().all()}
        print(f"Found {len(existing_works)} existing works in DB.")

        created = 0
        updated = 0
        skipped = 0

        for name_uz in names_uz:
            if name_uz not in TRANSLATIONS:
                print(f"  SKIP (no translation): {name_uz!r}")
                skipped += 1
                continue

            name_ru, name_en = TRANSLATIONS[name_uz]
            existing = existing_works.get(name_uz)

            if existing is None:
                print(f"  CREATE: {name_uz}")
                if not dry_run:
                    work = Work(
                        name_uz=name_uz,
                        name_ru=name_ru,
                        name_en=name_en,
                        status=True,
                    )
                    session.add(work)
                created += 1
            else:
                changed = (
                    existing.name_ru != name_ru
                    or existing.name_en != name_en
                )
                if changed:
                    print(f"  UPDATE id={existing.id}: {name_uz}")
                    if not dry_run:
                        existing.name_ru = name_ru
                        existing.name_en = name_en
                    updated += 1
                # else: already up to date, nothing to do

        if not dry_run:
            await session.commit()
            print(f"\nDone. Created: {created}, Updated: {updated}, Skipped: {skipped}")
        else:
            print(f"\nDry run — nothing written. Would create: {created}, update: {updated}, skip: {skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed daily work types from txt into the database.")
    parser.add_argument(
        "--txt",
        default=os.path.join(os.path.dirname(project_root), "daily_works.txt"),
        help="Path to daily_works.txt (default: repo root)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without writing to the database",
    )
    args = parser.parse_args()

    try:
        asyncio.run(seed_works(txt_path=args.txt, dry_run=args.dry_run))
    except Exception as e:
        print(f"ERROR: {e}")
        raise
