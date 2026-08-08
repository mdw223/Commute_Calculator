"""Cloudflare R2 object storage (S3-compatible API via boto3).

R2 holds the original uploaded files (resumes) and the generated .docx
cover letters. Extracted resume text is cached separately in Postgres
(see Document.extracted_text) so it can be attached to chat requests
without round-tripping through R2 on every message.
"""

import uuid
from functools import lru_cache

import boto3
from botocore.client import Config as BotoConfig

from app.config import settings


@lru_cache(maxsize=1)
def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def build_object_key(user_id: uuid.UUID, prefix: str, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_")
    return f"{prefix}/{user_id}/{uuid.uuid4()}-{safe_name}"


def upload_bytes(key: str, data: bytes, content_type: str) -> None:
    client = get_r2_client()
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


def delete_object(key: str) -> None:
    client = get_r2_client()
    client.delete_object(Bucket=settings.r2_bucket_name, Key=key)


def generate_presigned_url(key: str, filename: str | None = None) -> str:
    client = get_r2_client()
    params = {"Bucket": settings.r2_bucket_name, "Key": key}
    if filename:
        params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
    return client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=settings.r2_presigned_url_expire_seconds,
    )
