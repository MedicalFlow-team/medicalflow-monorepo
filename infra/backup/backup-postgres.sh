#!/usr/bin/env bash
# ============================================================
# MedicalFlow — backup diário do Postgres.
# Crontab: 0 3 * * *  (instalado no VPS — docs/infra/BACKUP.md)
#
# pg_dump dentro do container → /root/medflow/backups/ (gzip)
# Retenção: 7 dias. Falha (exit 1) se o dump sair vazio/pequeno.
# ============================================================
set -euo pipefail

ENV_FILE="/root/medflow/.env"
BACKUP_DIR="/root/medflow/backups"
RETENTION_DAYS=7

PG_CID="$(docker ps -qf 'name=medflow_postgres' | head -1)"
[ -n "$PG_CID" ] || { echo "[$(date -Is)] ERRO: container medflow_postgres não está rodando"; exit 1; }

DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"; DB="${DB:-medflow}"
PGUSER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"; PGUSER="${PGUSER:-medflow}"

mkdir -p "$BACKUP_DIR"
F="$BACKUP_DIR/medflow-$(date +%Y%m%d-%H%M).sql.gz"

if ! docker exec "$PG_CID" pg_dump -U "$PGUSER" "$DB" | gzip > "$F"; then
  echo "[$(date -Is)] ERRO: pg_dump falhou"
  rm -f "$F"
  exit 1
fi

SIZE="$(stat -c%s "$F")"
if [ "$SIZE" -lt 100 ]; then
  echo "[$(date -Is)] ERRO: backup suspeito ($SIZE bytes) — descartando"
  rm -f "$F"
  exit 1
fi

find "$BACKUP_DIR" -name 'medflow-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -Is)] backup ok: $F ($SIZE bytes, retenção ${RETENTION_DAYS}d)"
