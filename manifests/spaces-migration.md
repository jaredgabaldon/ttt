# Spaces migration to power-bucket

## Status

All 846 source objects (820,948,326 bytes) were copied into the requested `ttt/` destination prefix and verified by downloaded SHA-256, metadata, ACL, and final inventory checks on 2026-11-10. The destination-only `ttt/` folder marker was preserved. A public image returned HTTP 200; a private backup returned HTTP 403 anonymously. Live cutover completed on 2026-11-10. The original bucket remains intact; the temporary root-level destination copies were removed after verification. The backend and backup CronJob now use the new bucket, nested paths, and credential references.

- Source: `teris-toys-and-trinkets-media`, `sfo2`.
- Destination: `power-bucket`, `sfo3`.
- Source credentials: `teris-backend-secret`.
- Destination credentials: `compuweather-spaces-credentials`; use only its two AWS credential fields. Its other settings belong to CompuWeather.
- Map source `media/` to destination `ttt/media/` and source `database-backups/postgres/` to destination `ttt/database-backups/postgres/`. The pre-existing destination object `ttt/` must be preserved.
- Product images retain public-read ACLs; database dumps remain private.

## Required bucket settings

The destination credentials can list, upload, download, and delete objects, but cannot read lifecycle, policy, or CORS configuration. An anonymous request for a private test object returned 403.

The live lifecycle configuration was read back using the local `spaces-admin` profile and verified to match `postgres/backup-lifecycle.json`. No enabled expiration rule covers `ttt/media/`. It expires only `ttt/database-backups/postgres/` after seven days and aborts incomplete multipart uploads there after one day. Preserve unrelated rules. Do not make the whole bucket publicly readable. The source has no bucket policy or CORS configuration.

The backend now reads `AWS_LOCATION` (default `media`); the new manifest sets it to `ttt/media`. The deployed backend and backup image is `jaredgabaldon/teris-toys-and-trinkets-backend:spaces-ttt-20261110` (registry digest `sha256:5c6f3aad01ace62b881e6f7f95d12d283014a17097581b5b997d872c3fb70b04`). The backup script reads `SPACES_BACKUP_PREFIX` from the TTT ConfigMap, not the shared credential Secret.

## Configure lifecycle rules

Create a separate Full access Spaces key and configure it locally using `aws configure --profile spaces-admin` (region `sfo3`, output `json`). Do not replace the shared application key. From the project root, preview and then apply the merged rule:

```sh
backend/venv/bin/python manifests/postgres/configure-spaces-lifecycle.py --profile spaces-admin
backend/venv/bin/python manifests/postgres/configure-spaces-lifecycle.py --profile spaces-admin --apply
```

The helper preserves unrelated rules and refuses to proceed if an enabled expiration rule overlaps `ttt/media/`. It does not treat AccessDenied as an empty configuration.

## Completed validation

- Django checks passed in the built image; Kubernetes accepted the manifests in server-side dry runs.
- Backend rollout succeeded. Homepage, item/category APIs, admin login, and a product image returned HTTP 200. API image URLs use the new bucket and `ttt/media/`.
- A new image was saved through the live Django storage backend, fetched publicly, verified, and removed. The database still contains 817 catalog items.
- Manual job `teris-postgres-backup-spaces-1794347371` created `ttt/database-backups/postgres/postgres-20261110T214941Z.dump` (85,463 bytes), downloaded it, and verified SHA-256. Anonymous access returned HTTP 403.
- Retention removed one old destination archive, leaving seven. The CronJob is unsuspended and scheduled for 03:00 America/Denver.
- Rollback snapshots are in ignored `backups/spaces-migration/cutover/`. The old bucket was not changed.

## Cutover sequence (completed)

1. Copy all source objects and verify content hashes, metadata, and ACLs. Local migration tooling and reports are in ignored `backups/spaces-migration/`; no credentials are stored there.
2. Snapshot the live backend ConfigMap, Deployment, and backup CronJob. Record the running image digest and replica count.
3. Suspend scheduled backups, wait for any running backup job to finish, and pause media writes. Run a final synchronization and compare inventories. Reconcile source deletions only within the migration-owned object set.
4. Deploy the updated backup script and CronJob while suspended, then update the backend ConfigMap and Deployment. The backup CronJob must explicitly reference `teris-backend-config` and the new credential Secret. Avoid applying unrelated PostgreSQL resources.
5. Restore backend availability and verify API image URLs, public image access, a new media upload, and a manual private backup with checksum verification. Resume scheduled backups.
6. Keep the source bucket and legacy credential references available for recovery. A rollback after new writes requires copying those writes back first; changing settings alone is insufficient.

The database is not moved. Existing image records use relative paths, and no custom media domain is configured.
