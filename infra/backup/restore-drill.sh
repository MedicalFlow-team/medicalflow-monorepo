#!/usr/bin/env bash
# Restaura um backup físico do R2 em um container isolado, sem tocar na produção.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

stamp="${1:?uso: restore-drill.sh <timestamp UTC do backup> [alvo PITR UTC]}"
[[ "$stamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo "Timestamp inválido" >&2; exit 1; }
target="${2:-}"
if [ -n "$target" ]; then
  [[ "$target" =~ ^[-0-9TZ:.+[:space:]]+$ ]] || { echo "Alvo PITR inválido" >&2; exit 1; }
fi

mkdir -p "$BACKUP_DIR"
work="$(mktemp -d "$BACKUP_DIR/.restore-drill.XXXXXX")"
container="flowcare-restore-drill-$$"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

key="$R2_PREFIX/base/$stamp"
r2 s3 cp "s3://$R2_BUCKET/$key/base.tar.gz" "$work/base.tar.gz" --only-show-errors
r2 s3 cp "s3://$R2_BUCKET/$key/base.sha256" "$work/base.sha256" --only-show-errors
expected="$(cat "$work/base.sha256")"
actual="$(sha256sum "$work/base.tar.gz" | awk '{print $1}')"
[ "$actual" = "$expected" ] || { echo "SHA-256 do backup não confere" >&2; exit 1; }
tar -C "$work" -xzf "$work/base.tar.gz"
docker run --rm -v "$work:/restore:ro" postgres:16-alpine pg_verifybackup /restore/data

mkdir "$work/wal"
r2 s3 cp "s3://$R2_BUCKET/$R2_PREFIX/wal/" "$work/wal/" --recursive --only-show-errors
printf "restore_command = 'cp /wal/%%f %%p'\nrecovery_target_action = 'promote'\n" >> "$work/data/postgresql.auto.conf"
if [ -n "$target" ]; then
  printf "recovery_target_time = '%s'\n" "$target" >> "$work/data/postgresql.auto.conf"
fi
touch "$work/data/recovery.signal"
chown -R 70:70 "$work"

# Sem porta publicada ou rede: consultas são feitas somente via docker exec.
docker run -d --name "$container" --network none \
  -v "$work/data:/var/lib/postgresql/data" -v "$work/wal:/wal:ro" \
  postgres:16-alpine >/dev/null
db_user="$(config_value POSTGRES_USER)"
db_name="$(config_value POSTGRES_DB)"
: "${db_user:?POSTGRES_USER ausente}"
: "${db_name:?POSTGRES_DB ausente}"
ready=0
for _ in $(seq 1 90); do
  if docker exec "$container" pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  docker logs "$container" >&2
  echo "Restore não iniciou" >&2
  exit 1
fi

# Falha se as tabelas principais não existirem ou uma FK importante estiver órfã.
docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U "$db_user" -d "$db_name" <<'SQL'
SELECT 'User', count(*) FROM "User";
SELECT 'Organization', count(*) FROM "Organization";
SELECT 'Membership', count(*) FROM "Membership";
SELECT 'Session', count(*) FROM "Session";
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Membership" m LEFT JOIN "User" u ON u.id = m."userId" WHERE u.id IS NULL)
    OR EXISTS (SELECT 1 FROM "Membership" m LEFT JOIN "Organization" o ON o.id = m."organizationId" WHERE o.id IS NULL)
    OR EXISTS (SELECT 1 FROM "Session" s LEFT JOIN "User" u ON u.id = s."userId" WHERE u.id IS NULL)
  THEN RAISE EXCEPTION 'integridade referencial inválida'; END IF;
END $$;
SQL

echo "[$(date -Is)] restore drill OK: $stamp${target:+ até $target}"
