from typing import BinaryIO
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from app.core.config import settings


def get_minio_client() -> Minio:
    secure = bool(settings.minio_secure)
    # endpoint may include port like "minio:9000"
    endpoint = settings.minio_endpoint
    return Minio(
        endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=secure,
    )


def ensure_bucket(client: Minio) -> None:
    bucket = settings.minio_bucket
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
    except S3Error:
        # let caller handle exceptions/logging
        raise


def upload_fileobj(file_obj: BinaryIO, object_name: str, content_type: str | None = None) -> str:
    """Upload a file-like object to MinIO and return the object path (URL path).

    Returns the object name that can be used to build a public URL if needed.
    """
    client = get_minio_client()
    ensure_bucket(client)
    # We need the size; if file_obj has seek/tell we can compute it
    try:
        current = file_obj.tell()
        file_obj.seek(0, 2)
        size = file_obj.tell() - current
        file_obj.seek(current)
    except Exception:
        size = -1

    # If size is unknown, Minio client accepts length -1 for chunked upload
    client.put_object(
        settings.minio_bucket,
        object_name,
        file_obj,
        length=size,
        content_type=content_type,
    )
    return object_name


def get_presigned_url(object_name: str, expires: int = 3600) -> str:
    client = get_minio_client()
    return client.presigned_get_object(settings.minio_bucket, object_name, expires=timedelta(seconds=expires))


def _get_public_minio_client() -> Minio:
    endpoint = settings.minio_public_endpoint or settings.minio_endpoint
    return Minio(
        endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=bool(settings.minio_secure),
        region="us-east-1",
    )


def to_public_url(stored: str | None, expires: int = 3600) -> str | None:
    """Convert a stored media URL or object name into a browser-accessible presigned URL.

    The DB stores URLs like 'http://minio:9000/uploads/cameras/<id>/events/x.mp4',
    which the browser cannot reach. We re-sign against the public endpoint
    (e.g. 'localhost:9000') so the dashboard can fetch the file directly.
    """
    if not stored:
        return None
    try:
        object_name = stored
        bucket_prefix = f"/{settings.minio_bucket}/"
        if "://" in stored:
            idx = stored.find(bucket_prefix)
            if idx == -1:
                return stored
            object_name = stored[idx + len(bucket_prefix):]
        # Strip any pre-existing query string so re-running on an already-presigned URL is a no-op
        object_name = object_name.split("?", 1)[0]
        client = _get_public_minio_client()
        return client.presigned_get_object(
            settings.minio_bucket,
            object_name,
            expires=timedelta(seconds=expires),
        )
    except Exception:
        return stored
