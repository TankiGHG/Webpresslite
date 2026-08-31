#!/bin/sh
# Restores a backup produced by scripts/backup.sh.
#
#   ./scripts/restore.sh ./backups/2026-08-31T03-00-00Z
#
# This overwrites the current database and object store. It asks first.
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SOURCE="${1:-}"

if [ -z "${SOURCE}" ] || [ ! -d "${SOURCE}" ]; then
  echo "Usage: $0 <backup-directory>" >&2
  exit 1
fi

if [ ! -f "${SOURCE}/database.dump" ]; then
  echo "No database.dump in ${SOURCE}." >&2
  exit 1
fi

# shellcheck disable=SC1091
. ./.env

printf 'This overwrites the database and the media of this deployment. Continue? [yes/N] '
read -r answer
[ "${answer}" = "yes" ] || { echo "Aborted."; exit 1; }

echo "[restore] stopping the application"
docker compose -f "${COMPOSE_FILE}" stop app

echo "[restore] restoring the database"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner \
  < "${SOURCE}/database.dump"

if [ -d "${SOURCE}/media" ]; then
  echo "[restore] restoring the media"
  docker compose -f "${COMPOSE_FILE}" run --rm --no-deps \
    -v "$(cd "${SOURCE}/media" && pwd):/backup:ro" \
    --entrypoint /bin/sh minio-init -c "
      mc alias set local http://minio:9000 \"\${MINIO_ROOT_USER}\" \"\${MINIO_ROOT_PASSWORD}\" >/dev/null &&
      mc mirror --overwrite --remove /backup local/\"\${S3_BUCKET}\"
    "
fi

echo "[restore] starting the application"
docker compose -f "${COMPOSE_FILE}" up -d app

echo "[restore] done"
