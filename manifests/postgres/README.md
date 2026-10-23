# PostgreSQL migration preparation

This follows CompuWeather's single StatefulSet + PVC + internal Service pattern, retaining PostgreSQL. It is deliberately separate from `kubectl apply -k manifests`: creating an empty database must not switch the running app. Commands below run from the repository root, in the app's Kubernetes namespace (set your context namespace first).

## 1. Export DigitalOcean

Install PostgreSQL client tools (`psql`, `pg_dump`, `pg_restore`) on the export machine. Allow that machine through DigitalOcean's database trusted sources. Configure credentials using a private `.pgpass` file (mode 0600) or `PGPASSFILE`; do not put passwords in commands or commit them.

```sh
export PGHOST=db-postgresql-sfo2-41105-do-user-35993427-0.h.db.ondigitalocean.com
export PGPORT=25060
export PGDATABASE=defaultdb
export PGUSER=doadmin
export PGSSLMODE=require
psql -X -c 'SHOW server_version'
pg_dump --version
sh scripts/export-postgres.sh
```

The source export is PostgreSQL 18.6. The manifest uses `postgres:18.6`, mounts `/var/lib/postgresql`, and sets `PGDATA=/var/lib/postgresql/18/docker`. Never upgrade an existing data volume simply by changing the image major version.

The script creates a private, git-ignored `backups/postgres-XXXXXXXX/` containing a custom-format `database.dump`, source version, extension inventory, and archive table of contents. Errors leave a `.partial` file instead of a completed dump. The export contains schema, rows, sequences, and Django users/migrations; cluster roles and passwords are not copied. Check extension availability on the target. Archive listing is only a readability check. The separate trial restore was skipped by request; verify the actual import before cutover. Keep a secure copy outside this workstation.

This exports the database only. Product images remain in DigitalOcean Spaces, and current Spaces settings must remain available.

## 2. Provision

Confirm the Kubernetes context/namespace and default StorageClass, free capacity, source database size, and required extensions. The PVC requests 20Gi using `do-block-storage-retain`; the source measured about 9 MB. Deployment context is `do-sfo3-power-cluster-1`, namespace `default`. Set `storageClassName` explicitly if the cluster default is unsuitable. A single replica provides persistence, not high availability; arrange off-cluster backups and test recovery before retiring DigitalOcean.

Create a private ignored `manifests/postgres/credentials.env` with these keys:

```dotenv
POSTGRES_DB=defaultdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=REPLACE_WITH_NEW_ADMIN_PASSWORD
```

```sh
chmod 600 manifests/postgres/credentials.env
kubectl create secret generic teris-postgres-credentials --from-env-file=manifests/postgres/credentials.env
kubectl apply -k manifests/postgres
kubectl rollout status statefulset/teris-postgres
```

The bootstrap user is an administrator. Create a separate application login interactively, using a new password (psql's `\password` avoids embedding it in SQL/history):

```sh
kubectl exec -it teris-postgres-0 -- psql -U postgres -d defaultdb
```

```sql
CREATE ROLE teris_app LOGIN;
\password teris_app
ALTER DATABASE defaultdb OWNER TO teris_app;
GRANT ALL ON SCHEMA public TO teris_app;
\q
```

Secrets initialize only an empty volume; editing the Secret later does not change database passwords. Never delete the PVC as a routine restart or rollback step.

## 3. Import the existing export into the empty target

Do this before pointing Django at the new database: app startup automatically runs migrations. Substitute the actual dump path below. The target must be empty; this command intentionally does not drop existing data. If extensions require administrator installation, install them first and review the archive restore plan before proceeding.

```sh
kubectl exec -i teris-postgres-0 -- pg_restore --username=postgres --dbname=defaultdb --role=teris_app --no-owner --no-acl --exit-on-error --single-transaction < backups/postgres-eZEBw3l7/database.dump
kubectl exec teris-postgres-0 -- psql -U postgres -d defaultdb -c 'ANALYZE'
```

Verify table counts against the source snapshot, Django migration records, sequence-generated inserts, admin login, catalog responses, and image URLs using an isolated app instance configured for the target. Keep production on DigitalOcean until the import is verified. A failed transactional restore should leave the database unchanged; investigate any failure before retrying.

## 4. Final cutover (later)

1. Schedule a maintenance window and stop all writers, including the backend (`kubectl scale deployment teris-backend-deployment --replicas=0`), admin sessions, and any external scripts. Keep the source intact.
2. The existing export is being used because the user confirmed no changes since export. If writes have occurred since then, take a fresh export before proceeding.
3. Import the existing dump once as described above and verify it before starting the app. Do not repeat the import into an already populated database.
4. Change `manifests/backend-config.yaml`: `POSTGRES_HOST: "teris-postgres"`, `POSTGRES_PORT: "5432"`, keep `POSTGRES_DB: "defaultdb"`, and set `POSTGRES_SSLMODE: "disable"` for this internal service. This baseline has no database TLS; configure TLS before cutover if cluster traffic must be encrypted.
5. The backend explicitly reads `POSTGRES_USER` and `POSTGRES_PASSWORD` from `teris-postgres-app-credentials`. Preserve Django and Spaces values in `teris-backend-secret`; its legacy database credentials are overridden.
6. Apply the app manifests and watch `kubectl rollout status deployment/teris-backend-deployment`. The checked-in deployment restores one replica and runs migrations. Confirm admin, API, and media behavior before allowing writes.

If validation fails before new writes, scale the backend down, restore the DigitalOcean connection settings/credentials, then apply the app manifests again. After writes reach the target, switching back loses those writes unless reconciled first. Keep DigitalOcean until the new database and its independent backups have been proven.

References: [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html), [official PostgreSQL image](https://hub.docker.com/_/postgres).

## Current migration status

The export `backups/postgres-eZEBw3l7/database.dump` has been imported successfully into `defaultdb` on `teris-postgres-0` in context `do-sfo3-power-cluster-1`, namespace `default`. Do not rerun the import into this populated database.

The non-superuser application login is `teris_app`. Its credentials are stored in the separate Kubernetes Secret `teris-postgres-app-credentials`, with a private local copy in `backups/postgres-eZEBw3l7/application-credentials.env` (ignored by Git). The legacy backend Secret has not been changed; explicit database environment variables now reference the new application Secret.

All 12 table row counts matched read-only DigitalOcean queries after import, including 817 items, 23 categories, 2 users, and 21 migration records. An isolated Python process in the backend pod connected through `teris-postgres:5432` using the application credentials and passed Django's pending-migration check. The app cutover is complete. All 12 source/target table counts and content fingerprints matched with the backend stopped before switching. The running backend now connects to `teris-postgres` as `teris_app`. The public homepage, items API (817 items), categories API, admin login page, and a product image returned HTTP 200.

### Cutover recovery notes

Private pre-cutover deployment, ConfigMap, and Secret snapshots are in `backups/cutover/` (ignored by Git, files mode 0600). DigitalOcean remains intact. A rollback must restore both connection settings and the prior deployment environment configuration: the new explicit Secret references override legacy credentials in `envFrom`. Stop the backend before rollback and reconcile any writes made to Kubernetes since cutover; do not blindly switch back. Configure recurring independent database backups before retiring the old database.

## Automated daily backups

`teris-postgres-backup` runs daily at **03:00 America/Denver** (adjusts for daylight saving time). It uses PostgreSQL 18.6 `pg_dump` against `teris-postgres`, checks the custom archive with `pg_restore --list`, then uploads it with a private ACL to:

```text
s3://teris-toys-and-trinkets-media/database-backups/postgres/postgres-YYYYMMDDTHHMMSSZ.dump
```

The upload is downloaded and SHA-256 checked before pruning. The job retains at most seven successful archives and removes archives at least seven days old on each successful run. Spaces also has a seven-day expiration rule scoped exclusively to `database-backups/postgres/`, plus one-day incomplete multipart upload cleanup. Product images are unaffected. Spaces expiration is asynchronous, so deletion is not guaranteed at the exact seven-day timestamp, particularly if scheduled jobs fail. The local migration export and rollback snapshots are not managed by this cloud retention rule.

`backup-lifecycle.json` contains a single rule, not a full bucket lifecycle configuration. It was merged into the live bucket rules separately from Kubernetes; reapplying Kustomize does not configure Spaces. Preserve unrelated rules when updating it.

The CronJob prevents overlapping scheduled runs, retries failures twice, and limits jobs to 30 minutes. Temporary archive storage is capped at 2Gi; increase this if the database outgrows it. Uploads use the existing Spaces keys from `teris-backend-secret`; database access uses `teris-postgres-app-credentials`. The uploader uses the backend image's existing boto3 installation. Rotating either Secret applies to future backup pods.

```sh
kubectl --context=do-sfo3-power-cluster-1 -n default get cronjob teris-postgres-backup
kubectl --context=do-sfo3-power-cluster-1 -n default get jobs
kubectl --context=do-sfo3-power-cluster-1 -n default logs job/teris-postgres-backup-initial -c upload
```

For a manual run, choose a unique Job name:

```sh
kubectl --context=do-sfo3-power-cluster-1 -n default create job teris-postgres-backup-manual-YYYYMMDD --from=cronjob/teris-postgres-backup
```

To recover, download the desired private `.dump` with authenticated Spaces access, provision an empty PostgreSQL 18 database and application login, then use the import procedure above. Backups include database records and schema; Spaces product images, Kubernetes Secrets, and cluster configuration are separate. Automated checks validate archive readability and upload integrity, not a full restore rehearsal.

The initial backup completed successfully and its downloaded checksum matched. Anonymous access was denied with HTTP 403.
