import hashlib
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import boto3

BUCKET = "teris-toys-and-trinkets-media"
PREFIX = "database-backups/postgres/"
s3 = boto3.client("s3", endpoint_url="https://sfo2.digitaloceanspaces.com", region_name="sfo2")
archive = Path("/backup/database.dump")
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
key = PREFIX + "postgres-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + ".dump"
s3.upload_file(str(archive), BUCKET, key, ExtraArgs={"ACL": "private", "Metadata": {"sha256": digest}})
head = s3.head_object(Bucket=BUCKET, Key=key)
if head["ContentLength"] != archive.stat().st_size or head["Metadata"].get("sha256") != digest:
    raise RuntimeError("Uploaded backup verification failed")
# Download and hash the stored object, not just its metadata.
body = s3.get_object(Bucket=BUCKET, Key=key)["Body"]
hash_check = hashlib.sha256()
try:
    for chunk in iter(lambda: body.read(1024 * 1024), b""):
        hash_check.update(chunk)
finally:
    body.close()
if hash_check.hexdigest() != digest:
    raise RuntimeError("Stored backup checksum mismatch")
print(f"Verified private backup: s3://{BUCKET}/{key} ({head['ContentLength']} bytes)", flush=True)
# Keep seven daily restore points, including today's. A seven-day lifecycle
# rule also expires these objects if the Kubernetes job stops running.
objects = []
for page in s3.get_paginator("list_objects_v2").paginate(Bucket=BUCKET, Prefix=PREFIX):
    objects.extend(o for o in page.get("Contents", []) if o["Key"].endswith(".dump"))
objects.sort(key=lambda o: o["LastModified"], reverse=True)
cutoff = datetime.now(timezone.utc) - timedelta(days=7)
expired = [o for i, o in enumerate(objects) if i >= 7 or o["LastModified"] <= cutoff]
for obj in expired:
    s3.delete_object(Bucket=BUCKET, Key=obj["Key"])
print(f"Retention complete: removed {len(expired)} old backups", flush=True)
