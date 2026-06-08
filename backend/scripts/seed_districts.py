"""
Seed districts from districts_data.csv into the database.

The CSV has columns: id, name_en, name_uz, name_ru, region_name
Regions are matched by name_en (case-insensitive) against the region_name column.

Usage (from inside the backend container or with venv active):
    python scripts/seed_districts.py
    python scripts/seed_districts.py --csv /path/to/districts_data.csv
    python scripts/seed_districts.py --dry-run
"""
import asyncio
import csv
import os
import sys
import argparse

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.location import Region, District


def build_region_lookup(regions: list[Region]) -> dict[str, int]:
    """
    Build a case-insensitive lookup: region name (en/uz/ru) → region.id.
    The CSV uses English region names, so we index all three fields to be safe.
    """
    lookup: dict[str, int] = {}
    for region in regions:
        for name in (region.name_en, region.name_uz, region.name_ru):
            if name:
                lookup[name.strip().lower()] = region.id
    return lookup


async def seed_districts(csv_path: str, dry_run: bool = False) -> None:
    if not os.path.exists(csv_path):
        print(f"ERROR: CSV file not found: {csv_path}")
        sys.exit(1)

    async with async_session_maker() as session:
        # Load all regions into memory for matching
        result = await session.execute(select(Region))
        regions = result.scalars().all()
        if not regions:
            print("ERROR: No regions found in the database. Run populate_uzb_regions.py first.")
            sys.exit(1)

        region_lookup = build_region_lookup(regions)
        print(f"Loaded {len(regions)} regions from DB.")

        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"Found {len(rows)} districts in CSV.")

        created = 0
        updated = 0
        skipped = 0

        for row in rows:
            district_id = int(row["id"])
            name_en = row["name_en"].strip()
            name_uz = row["name_uz"].strip()
            name_ru = row["name_ru"].strip()
            region_name = row["region_name"].strip()

            region_id = region_lookup.get(region_name.lower())
            if region_id is None:
                print(f"  SKIP (no region match): '{region_name}' — district '{name_en}' (id={district_id})")
                skipped += 1
                continue

            # Check if district already exists by ID
            existing = await session.get(District, district_id)

            if existing is None:
                print(f"  CREATE district id={district_id}: {name_en} → region_id={region_id}")
                if not dry_run:
                    district = District(
                        id=district_id,
                        name_en=name_en,
                        name_uz=name_uz,
                        name_ru=name_ru,
                        is_active=True,
                        region_id=region_id,
                    )
                    session.add(district)
                created += 1
            else:
                # Update names and region in case the CSV has corrections
                changed = (
                    existing.name_en != name_en
                    or existing.name_uz != name_uz
                    or existing.name_ru != name_ru
                    or existing.region_id != region_id
                )
                if changed:
                    print(f"  UPDATE district id={district_id}: {name_en}")
                    if not dry_run:
                        existing.name_en = name_en
                        existing.name_uz = name_uz
                        existing.name_ru = name_ru
                        existing.region_id = region_id
                    updated += 1
                else:
                    updated += 0  # already up to date, silent

        if not dry_run:
            await session.commit()
            print(f"\nDone. Created: {created}, Updated: {updated}, Skipped (no region): {skipped}")
        else:
            print(f"\nDry run — nothing written. Would create: {created}, update: {updated}, skip: {skipped}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed districts from CSV into the database.")
    parser.add_argument(
        "--csv",
        default=os.path.join(os.path.dirname(project_root), "districts_data.csv"),
        help="Path to districts_data.csv (default: repo root)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be done without writing to the database",
    )
    args = parser.parse_args()

    try:
        asyncio.run(seed_districts(csv_path=args.csv, dry_run=args.dry_run))
    except Exception as e:
        print(f"ERROR: {e}")
        raise
