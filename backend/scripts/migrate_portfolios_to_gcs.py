#!/usr/bin/env python3
"""
Migrate resume portfolio and video files from local storage to Google Cloud Storage.
Updates the database with new GCS URLs.

Usage:
    cd backend && python -m scripts.migrate_portfolios_to_gcs
    # Or from project root:
    python -m backend.scripts.migrate_portfolios_to_gcs

Ensure .env has GCS_BUCKET_NAME, GCS_CREDENTIALS_FILE (or GOOGLE_APPLICATION_CREDENTIALS).
"""
import asyncio
import os
import sys

script_dir = os.path.dirname(os.path.abspath(__file__))
backend_root = os.path.dirname(script_dir)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

# Load .env from project root (parent of backend)
project_root = os.path.dirname(backend_root)
env_path = os.path.join(project_root, ".env")
if os.path.exists(env_path):
    try:
        from dotenv import load_dotenv
        load_dotenv(env_path)
    except ImportError:
        pass  # pydantic-settings will load .env

from pathlib import Path
from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session_maker
from app.models.resume import Resume
from app.services.storage import upload_local_file_to_gcs


def _is_local_path(url: str | None) -> bool:
    """Check if URL is a local path (e.g. /uploads/portfolios/xxx)."""
    return bool(url and url.strip().startswith("/uploads/"))


def _local_path_to_file_path(url: str, base_dir: Path) -> Path:
    """Convert /uploads/portfolios/xxx to absolute file path. base_dir is parent of 'uploads'."""
    # url = /uploads/portfolios/filename -> base_dir/uploads/portfolios/filename
    relative = url.lstrip("/")
    return base_dir / relative


def _get_object_name(url: str) -> str:
    """Extract object name from local path: /uploads/portfolios/xxx -> portfolios/xxx."""
    return url.lstrip("/").replace("uploads/", "", 1)


async def migrate_resumes_to_gcs(uploads_base: Path | None = None, dry_run: bool = False):
    """
    Find resumes with local portfolio/video paths, upload to GCS, update DB.
    """
    if not settings.GCS_BUCKET_NAME:
        print("ERROR: GCS_BUCKET_NAME is not set in .env")
        sys.exit(1)

    # Resolve base dir (parent of uploads/): backend/ or project_root/
    if uploads_base is None:
        for base in [Path(backend_root), Path(project_root)]:
            uploads_dir = base / "uploads"
            if (uploads_dir / "portfolios").exists() or (uploads_dir / "videos").exists():
                uploads_base = base
                break
        else:
            uploads_base = Path(backend_root)

    print(f"Base directory (parent of uploads/): {uploads_base.absolute()}")
    uploads_dir = uploads_base / "uploads"
    if not uploads_dir.exists():
        print(f"ERROR: Uploads directory not found: {uploads_dir}")
        sys.exit(1)

    async with async_session_maker() as session:
        result = await session.execute(
            select(Resume).where(
                (Resume.portfolio.isnot(None)) | (Resume.video.isnot(None))
            )
        )
        resumes = result.scalars().all()

    migrated = 0
    skipped = 0
    errors = []

    for resume in resumes:
        updates = {}

        for field, prefix in [("portfolio", "portfolios"), ("video", "videos")]:
            url = getattr(resume, field)
            if not url:
                continue

            if not _is_local_path(url):
                skipped += 1
                continue

            local_path = _local_path_to_file_path(url, uploads_base)
            if not local_path.exists():
                errors.append(f"Resume {resume.id} {field}: file not found: {local_path}")
                continue

            object_name = _get_object_name(url)
            if not object_name.startswith(prefix + "/"):
                object_name = f"{prefix}/{Path(url).name}"

            try:
                if dry_run:
                    print(f"  [DRY RUN] Would upload {local_path} -> gs://{settings.GCS_BUCKET_NAME}/{object_name}")
                    new_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{object_name}"
                    if settings.GCS_PUBLIC_BASE_URL:
                        new_url = f"{settings.GCS_PUBLIC_BASE_URL.rstrip('/')}/{object_name}"
                    updates[field] = new_url
                else:
                    new_url = upload_local_file_to_gcs(local_path, object_name)
                    updates[field] = new_url
                    print(f"  Uploaded: {resume.id} {field} -> {new_url}")
            except Exception as e:
                errors.append(f"Resume {resume.id} {field}: {e}")

        if updates:
            if not dry_run:
                async with async_session_maker() as session:
                    stmt = select(Resume).where(Resume.id == resume.id)
                    r = await session.execute(stmt)
                    r = r.scalar_one()
                    for k, v in updates.items():
                        setattr(r, k, v)
                    await session.commit()
            migrated += 1

    print(f"\nDone. Migrated: {migrated}, Skipped (already GCS): {skipped}")
    if errors:
        print("\nErrors:")
        for e in errors:
            print(f"  - {e}")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("DRY RUN - no changes will be made\n")

    try:
        asyncio.run(migrate_resumes_to_gcs(dry_run=dry_run))
    except KeyboardInterrupt:
        print("\nAborted.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
