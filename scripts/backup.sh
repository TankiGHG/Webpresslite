#!/bin/sh
# Backs up the database and the object store.
#
# Meant to run from cron on the Docker host:
#   0 3 * * *  cd /opt/webpresslite && ./scripts/backup.sh >> /var/log/webpresslite-backup.log 2>&1
#
# Both parts are dumped into one timestamped directory, so a restore never has
# to match a database dump against media from a different point in time.
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
TARGET="${BACKUP_ROOT}/${STAMP}"

log() {
  echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

if [ ! -f .env ]; then
  echo "[backup] .env not found; run this from the deployment directory." >&2
  exit 1
fi

# shellcheck disable=SC1091
. ./.env

: "${POSTGRES_USER:?POSTGRES_USER is not set}"
: "${POSTGRES_DB:?POSTGRES_DB is not set}"
: "${S3_BUCKET:?S3_BUCKET is not set}"

mkdir -p "${TARGET}"

# --- Database ---------------------------------------------------------------
# The custom format restores with pg_restore and compresses on the way out.
log "dumping database ${POSTGRES_DB}"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --format=custom --no-owner \
  > "${TARGET}/database.dump"

if [ ! -s "${TARGET}/database.dump" ]; then
  echo "[backup] database dump is empty; aborting" >&2
  exit 1
fi

log "database dump: $(du -h "${TARGET}/database.dump" | cut -f1)"

# --- Object store -----------------------------------------------------------
# `mc mirror` copies the bucket into the backup directory. It runs inside a
# throwaway container on the compose network, so MinIO stays unreachable from
# outside.
log "mirroring bucket ${S3_BUCKET}"
mkdir -p "${TARGET}/media"

docker compose -f "${COMPOSE_FILE}" run --rm --no-deps \
  -v "$(cd "${TARGET}" && pwd)/media:/backup" \
  --entrypoint /bin/sh minio-init -c "
    mc alias set local http://minio:9000 \"\${MINIO_ROOT_USER}\" \"\${MINIO_ROOT_PASSWORD}\" >/dev/null &&
    mc mirror --overwrite --remove local/\"\${S3_BUCKET}\" /backup
  "

log "media: $(du -sh "${TARGET}/media" | cut -f1)"

# --- Retention --------------------------------------------------------------
# Older sets are removed only after the new one is complete, so a failed run
# never leaves the deployment without a backup.
log "removing backups older than ${KEEP_DAYS} days"
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +

log "done: ${TARGET}"
