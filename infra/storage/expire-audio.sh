#!/usr/bin/env bash
set -euo pipefail

container_id="$(docker ps --filter label=com.docker.swarm.service.name=flowcare_api --format '{{.ID}}' | head -n 1)"
if [[ -z "$container_id" ]]; then
  echo "Flowcare API container is unavailable" >&2
  exit 1
fi

if [[ "${1:-}" == "--apply" ]]; then
  docker exec "$container_id" bun src/jobs/expire-audio.ts --apply
else
  docker exec "$container_id" bun src/jobs/expire-audio.ts
fi
