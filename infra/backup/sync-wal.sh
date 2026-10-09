#!/usr/bin/env bash
# Envia segmentos WAL concluídos ao R2. Nunca apaga objetos do bucket.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"
mkdir -p "$WAL_DIR" "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/.wal-sync.lock"
flock -n 9 || exit 0
trap 'status=$?; if [ "$status" -ne 0 ]; then backup_alert "FALHA no envio de WAL (exit $status)"; fi' EXIT

while IFS= read -r -d '' file; do
  name="${file##*/}"
  [[ "$name" =~ ^[0-9A-F]{24}(\.[0-9A-F]{8}\.backup)?$|^[0-9A-F]{8}\.history$ ]] || continue
  key="$R2_PREFIX/wal/$name"
  local_size="$(stat -c %s "$file")"
  local_hash="$(sha256sum "$file" | awk '{print $1}')"
  remote_size="$(r2 s3api head-object --bucket "$R2_BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || true)"
  remote_hash=""
  if [ -n "$remote_size" ]; then
    remote_hash="$(r2 s3api head-object --bucket "$R2_BUCKET" --key "$key" --query Metadata.sha256 --output text)"
  fi
  if [ "$remote_size" != "$local_size" ]; then
    [ -z "$remote_size" ] || { echo "WAL remoto difere: $name" >&2; exit 1; }
    r2 s3 cp "$file" "s3://$R2_BUCKET/$key" --metadata "sha256=$local_hash" --only-show-errors
    remote_size="$(r2 s3api head-object --bucket "$R2_BUCKET" --key "$key" --query ContentLength --output text)"
    remote_hash="$(r2 s3api head-object --bucket "$R2_BUCKET" --key "$key" --query Metadata.sha256 --output text)"
  fi
  [ "$remote_size" = "$local_size" ] && [ "$remote_hash" = "$local_hash" ] || {
    echo "WAL remoto não confere: $name" >&2; exit 1;
  }
  # Só libera o spool local depois de confirmar o objeto no R2.
  if [ "$(find "$file" -mtime +7 -print)" ]; then rm -f "$file"; fi
done < <(find "$WAL_DIR" -maxdepth 1 -type f -print0 | sort -z)

date -u +%s > "$BACKUP_DIR/.last-wal-sync-ok"
