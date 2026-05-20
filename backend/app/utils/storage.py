from typing import BinaryIO
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
    return client.presigned_get_object(settings.minio_bucket, object_name, expires=expires)
