#!/usr/bin/env bash
# A cada 5 min, alerta se backup diário ou envio de WAL não ocorreu na janela.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"
mkdir -p "$BACKUP_DIR"
now="$(date -u +%s)"
state=ok
if [ ! -f "$BACKUP_DIR/.last-backup-ok" ] ||
   [ $((now - $(stat -c %Y "$BACKUP_DIR/.last-backup-ok"))) -gt 93600 ]; then
  state=backup-atrasado
fi
if [ ! -f "$BACKUP_DIR/.last-wal-sync-ok" ] ||
   [ $((now - $(stat -c %Y "$BACKUP_DIR/.last-wal-sync-ok"))) -gt 900 ]; then
  state="${state},wal-atrasado"
fi
previous="$(cat "$BACKUP_DIR/.backup-health-state" 2>/dev/null || true)"
if [ "$state" != "$previous" ]; then
  backup_alert "estado: $state (antes: ${previous:-desconhecido})"
  printf '%s\n' "$state" > "$BACKUP_DIR/.backup-health-state"
fi
[ "$state" = ok ]
