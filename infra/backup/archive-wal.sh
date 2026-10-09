#!/usr/bin/env bash
# Executado pelo PostgreSQL como archive_command. O rename no mesmo volume
# evita que um arquivo parcial seja aceito como WAL arquivado.
set -euo pipefail
src="${1:?arquivo WAL}"
name="${2:?nome WAL}"
[[ "$name" =~ ^[0-9A-F]{24}(\.[0-9A-F]{8}\.backup)?$|^[0-9A-F]{8}\.history$ ]] || exit 1
dest="${WAL_ARCHIVE_DIR:-/wal-archive}/$name"
if [ -f "$dest" ]; then
  cmp -s "$src" "$dest"
  exit $?
fi
tmp="${dest}.tmp.$$"
trap 'rm -f "$tmp"' EXIT
cp "$src" "$tmp"
cmp -s "$src" "$tmp"
mv "$tmp" "$dest"
