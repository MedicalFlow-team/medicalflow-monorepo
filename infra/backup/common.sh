#!/usr/bin/env bash
set -euo pipefail
umask 077

BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-/root/flowcare/backup.env}"
if [ ! -r "$BACKUP_ENV_FILE" ]; then
  echo "Backup config ausente: $BACKUP_ENV_FILE" >&2
  exit 1
fi
# Arquivo privado de root, separado do env da aplicação.
# shellcheck source=/dev/null
source "$BACKUP_ENV_FILE"

: "${R2_ENDPOINT:?configure R2_ENDPOINT}"
: "${R2_BUCKET:?configure R2_BUCKET}"
: "${AWS_ACCESS_KEY_ID:?configure AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?configure AWS_SECRET_ACCESS_KEY}"
[[ "$R2_ENDPOINT" == https://* ]] || { echo "R2_ENDPOINT deve usar HTTPS" >&2; exit 1; }

export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto AWS_EC2_METADATA_DISABLED=true
BACKUP_DIR="${BACKUP_DIR:-/root/flowcare/backups}"
WAL_DIR="${WAL_DIR:-/root/flowcare/wal-spool}"
R2_PREFIX="${R2_PREFIX:-flowcare/postgres}"

r2() { aws --endpoint-url "$R2_ENDPOINT" --region auto "$@"; }

config_value() {
  local key="$1"
  sed -n "s/^${key}=//p" /root/flowcare/.env | tail -1
}

postgres_container() {
  local cid
  cid="$(docker ps -qf name=flowcare_postgres | head -1)"
  [ -n "$cid" ] || { echo "Postgres da stack não está rodando" >&2; return 1; }
  printf '%s' "$cid"
}

backup_alert() {
  local message="$1"
  echo "[$(date -Is)] $message" >&2
  if [ -n "${BACKUP_ALERT_WEBHOOK:-}" ]; then
    local payload
    payload="$(printf '%s' "$message" | python3 -c 'import json,sys; print(json.dumps({"content":"[flowcare backup] "+sys.stdin.read()}))')"
    curl -fsS --max-time 10 -H 'Content-Type: application/json' -d "$payload" "$BACKUP_ALERT_WEBHOOK" >/dev/null || true
  fi
}
