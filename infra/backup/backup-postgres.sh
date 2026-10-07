#!/usr/bin/env bash
# Backup físico diário. WAL é enviado continuamente por sync-wal.sh.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

mkdir -p "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/.backup.lock"
flock -n 9 || { echo "Outro backup está em execução" >&2; exit 1; }

work=""
on_exit() {
  local status=$?
  if [ "$status" -ne 0 ]; then backup_alert "FALHA no backup diário (exit $status)"; fi
  if [ -n "$work" ]; then rm -rf "$work"; fi
}
trap on_exit EXIT

cid="$(postgres_container)"
db_user="$(config_value POSTGRES_USER)"
db_password="$(config_value POSTGRES_PASSWORD)"
: "${db_user:?POSTGRES_USER ausente}"
: "${db_password:?POSTGRES_PASSWORD ausente}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d "$BACKUP_DIR/.backup-${stamp}.XXXXXX")"
mkdir "$work/data"
chown 70:70 "$work" "$work/data"

# Um container temporário partilha apenas a rede do Postgres. A cópia inclui
# WAL até o fim do backup; pg_verifybackup confere o manifesto físico.
docker run --rm --network "container:$cid" \
  -e PGPASSWORD="$db_password" -v "$work:/backup" postgres:16-alpine \
  pg_basebackup -h 127.0.0.1 -U "$db_user" -D /backup/data -Fp -Xs -c fast --no-password
docker run --rm -v "$work:/backup:ro" postgres:16-alpine \
  pg_verifybackup /backup/data

tar -C "$work" -czf "$work/base.tar.gz" data
sha256sum "$work/base.tar.gz" | awk '{print $1}' > "$work/base.sha256"
key="$R2_PREFIX/base/$stamp"
r2 s3 cp "$work/base.tar.gz" "s3://$R2_BUCKET/$key/base.tar.gz" --only-show-errors
r2 s3 cp "$work/base.sha256" "s3://$R2_BUCKET/$key/base.sha256" --only-show-errors

# A confirmação remota é a condição de sucesso; não basta criar arquivo local.
r2 s3api head-object --bucket "$R2_BUCKET" --key "$key/base.tar.gz" >/dev/null
r2 s3api head-object --bucket "$R2_BUCKET" --key "$key/base.sha256" >/dev/null
printf '%s\n' "$stamp" > "$BACKUP_DIR/.last-backup-ok"
echo "[$(date -Is)] backup verificado e enviado: $key"
