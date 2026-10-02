# Backup & restore — Postgres

## Backup (automático)

`infra/backup/backup-postgres.sh` roda no cron às 03:00 (VPS):

- `pg_dump` dentro do container → gzip em `/root/medflow/backups/medflow-YYYYmmdd-HHMM.sql.gz`;
- falha se o dump sair com menos de 100 bytes (nunca guarda um backup furado);
- retenção de 7 dias.

Testar manualmente a qualquer momento: `bash infra/backup/backup-postgres.sh`.

## Restore (procedimento testado)

**Restore para o banco de produção** (apaga e recria os dados):

```bash
bash infra/backup/backup-postgres.sh   # 1. faça um backup ANTES

PG_CID="$(docker ps -qf name=medflow_postgres)"
DB="$(grep -E '^POSTGRES_DB=' /root/medflow/.env | cut -d= -f2-)"
PGUSER="$(grep -E '^POSTGRES_USER=' /root/medflow/.env | cut -d= -f2-)"

# 2. derruba quem escreve
docker scale medflow_api=0

# 3. recria o banco vazio e restaura
docker exec "$PG_CID" psql -U "$PGUSER" -c "DROP DATABASE $DB WITH (FORCE);"
docker exec "$PG_CID" psql -U "$PGUSER" -c "CREATE DATABASE $DB;"
gunzip -c /root/medflow/backups/medflow-<TIMESTAMP>.sql.gz | docker exec -i "$PG_CID" psql -U "$PGUSER" -d "$DB" -q

# 4. valida e volta a API
docker exec "$PG_CID" psql -U "$PGUSER" -d "$DB" -c "\dx"   # unaccent + pg_trgm presentes
docker scale medflow_api=1
```

## Validação do restore (fazer num banco descartável, não em prod)

```bash
PG_CID="$(docker ps -qf name=medflow_postgres)"
docker exec "$PG_CID" psql -U medflow -c "CREATE DATABASE medflow_restore_test;"
gunzip -c /root/medflow/backups/medflow-<TIMESTAMP>.sql.gz | \
  docker exec -i "$PG_CID" psql -U medflow -d medflow_restore_test -q
docker exec "$PG_CID" psql -U medflow -d medflow_restore_test -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
docker exec "$PG_CID" psql -U medflow -c "DROP DATABASE medflow_restore_test;"
```

## Limitações conhecidas (aceitas no MVP)

- Backup local no mesmo VPS. Off-site (S3) = decisão futura quando o dado for real
  (hoje não há pacientes em produção; o custo/complexidade não se paga ainda).
- RPO de até 24h (backup diário).
