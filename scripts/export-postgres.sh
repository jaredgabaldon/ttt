#!/bin/sh
# Uses standard libpq PG* variables and .pgpass; never sources project secrets.
set -eu
umask 077
for tool in psql pg_dump pg_restore; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing PostgreSQL client: $tool" >&2; exit 1; }
done
: "${PGHOST:?Set PGHOST to the DigitalOcean database host}"
: "${PGUSER:?Set PGUSER to the DigitalOcean database user}"
: "${PGDATABASE:?Set PGDATABASE to the database to export}"
export PGPORT="${PGPORT:-25060}"
export PGSSLMODE="${PGSSLMODE:-require}"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-15}"
mkdir -p backups
output=$(mktemp -d backups/postgres-XXXXXXXX)
echo "Writing private backup directory: $output"
psql -X --no-password --set ON_ERROR_STOP=1 --tuples-only --no-align --command 'SHOW server_version' > "$output/server-version.txt"
psql -X --no-password --set ON_ERROR_STOP=1 --command 'SELECT extname, extversion FROM pg_extension ORDER BY extname' > "$output/extensions.txt"
pg_dump --no-password --format=custom --no-acl --file="$output/database.dump.partial"
pg_restore --list "$output/database.dump.partial" > "$output/contents.txt"
mv "$output/database.dump.partial" "$output/database.dump"
echo "Export complete: $output/database.dump"
echo "Test a restore before treating this archive as a verified backup."
