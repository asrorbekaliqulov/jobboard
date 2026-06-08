"""
Storage service for file uploads.
Supports local filesystem (fallback) and Google Cloud Storage.
"""
import os
from pathlib import Path
from typing import BinaryIO

from app.core.config import settings


def _get_gcs_client():
    """Lazy import to avoid requiring google-cloud-storage when using local storage."""
    from google.cloud import storage

    creds_path = settings.GCS_CREDENTIALS_FILE or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        path = Path(creds_path)
        if path.exists():
            return storage.Client.from_service_account_json(str(path))
        raise FileNotFoundError(
            f"GCS credentials file not found: {creds_path}. "
            "Ensure GCS_CREDENTIALS_FILE points to a valid service account JSON and the file is mounted in Docker."
        )
    raise ValueError(
        "GCS credentials not configured. Set GCS_CREDENTIALS_FILE or GOOGLE_APPLICATION_CREDENTIALS."
    )


def upload_to_gcs(
    file_obj: BinaryIO,
    object_name: str,
    content_type: str | None = None,
) -> str:
    """
    Upload file to Google Cloud Storage.
    Returns the public URL of the uploaded object.
    """
    client = _get_gcs_client()
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(object_name)

    file_obj.seek(0)
    blob.upload_from_file(file_obj, content_type=content_type)

    if settings.GCS_PUBLIC_BASE_URL:
        base = settings.GCS_PUBLIC_BASE_URL.rstrip("/")
        return f"{base}/{object_name}"
    return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{object_name}"


def upload_local(
    file_obj: BinaryIO,
    local_path: Path,
) -> str:
    """
    Upload file to local filesystem.
    Returns the relative URL path (e.g. /uploads/portfolios/filename).
    """
    local_path.parent.mkdir(parents=True, exist_ok=True)
    with local_path.open("wb") as buffer:
        file_obj.seek(0)
        buffer.write(file_obj.read())
    return f"/uploads/{local_path.parent.name}/{local_path.name}"


def upload_local_file_to_gcs(local_path: Path, object_name: str) -> str:
    """
    Upload a local file to GCS by path.
    Returns the public URL of the uploaded object.
    """
    with open(local_path, "rb") as f:
        return upload_to_gcs(f, object_name)


def upload_file(
    file_obj: BinaryIO,
    prefix: str,
    filename: str,
    content_type: str | None = None,
) -> str:
    """
    Upload a file to storage (GCS or local based on config).
    Returns the URL to access the file (full GCS URL or relative local path).
    """
    object_name = f"{prefix}/{filename}"

    if settings.GCS_BUCKET_NAME:
        return upload_to_gcs(file_obj, object_name, content_type)

    local_dir = Path("uploads") / prefix
    return upload_local(file_obj, local_dir / filename)


def delete_file(url_or_path: str) -> bool:
    """
    Delete a file from storage by its URL or path.
    Returns True if deleted (or not found), False on error.
    """
    if not url_or_path or not url_or_path.strip():
        return True

    url_or_path = url_or_path.strip()

    # Local path: /uploads/portfolios/xxx or /uploads/videos/xxx
    if url_or_path.startswith("/uploads/"):
        local_path = Path(url_or_path.lstrip("/"))
        try:
            if local_path.exists():
                local_path.unlink()
            return True
        except OSError:
            return False

    # GCS URL: https://storage.googleapis.com/bucket/portfolios/xxx or custom CDN
    if settings.GCS_BUCKET_NAME and url_or_path.startswith("http"):
        try:
            from urllib.parse import urlparse

            path = urlparse(url_or_path).path.lstrip("/")
            if not path:
                return True

            # storage.googleapis.com: path = BUCKET/portfolios/xxx -> object = portfolios/xxx
            if "storage.googleapis.com" in url_or_path and path.startswith(f"{settings.GCS_BUCKET_NAME}/"):
                object_name = path[len(settings.GCS_BUCKET_NAME) + 1:]
            elif settings.GCS_PUBLIC_BASE_URL and url_or_path.startswith(settings.GCS_PUBLIC_BASE_URL.rstrip("/")):
                object_name = url_or_path.split(settings.GCS_PUBLIC_BASE_URL.rstrip("/") + "/", 1)[-1]
            else:
                object_name = "/".join(path.split("/")[1:]) if "/" in path else path

            if object_name:
                client = _get_gcs_client()
                bucket = client.bucket(settings.GCS_BUCKET_NAME)
                blob = bucket.blob(object_name)
                blob.delete()
            return True
        except Exception:
            return False

    return True
