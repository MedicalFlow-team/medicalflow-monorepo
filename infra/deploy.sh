#!/usr/bin/env bash
# ============================================================
# MedicalFlow — deploy da stack no Docker Swarm.
# Executa NO VPS (chamado por .github/workflows/deploy.yml via SSH,
# ou manualmente: bash infra/deploy.sh <tag-da-imagem>).
#
# Passos: stack deploy → migrations (se existirem) → aguarda /health.
# ============================================================
set -euo pipefail

TAG="${1:?uso: deploy.sh <tag-da-imagem>}"
REPO_DIR="/root/medicalflow-monorepo"
STACK="medflow"
ENV_FILE="/root/medflow/.env"

# Variáveis do Postgres lidas do .env de produção (mesma fonte da stack)
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)"
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)"

cd "$REPO_DIR"
export MEDFLOW_TAG="$TAG"

# --- Pré-pull síncrono das imagens ---
# Tarefas do swarm puxam de forma assíncrona: se o pull falhar depois que o
# GITHUB_TOKEN do workflow expirar, a task falha, o update_config reverte e o
# deploy mente "verde" (foi o caso real do run 36372580830). Puxando aqui:
# - falha cedo e alto com o motivo exato (denied / network);
# - as tasks do swarm resolvem a imagem já presente no node, sem depender
#   do registry durante o rollout.
echo "==> pré-pull das imagens (tag $TAG)"
docker pull "ghcr.io/medicalflow-team/medicalflow-monorepo-api:$TAG"
docker pull "ghcr.io/medicalflow-team/medicalflow-monorepo-web:$TAG"

echo "==> docker stack deploy ($STACK, tag $TAG)"
docker stack deploy --with-registry-auth -c stacks/medflow-stack.yml "$STACK"

# --- Extensões do Postgres (unaccent + pg_trgm — §3.2 da busca) ---
# Swarm não suporta bind mount relativo (initdb do compose dev não roda aqui),
# então aplicamos a mesma SQL de docker/postgres/initdb de forma idempotente.
echo "==> garantindo extensões do Postgres (unaccent, pg_trgm)"
for i in $(seq 1 30); do
  PG_CID="$(docker ps -qf "name=${STACK}_postgres" | head -1)"
  if [ -n "$PG_CID" ] && docker exec "$PG_CID" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    docker exec -i "$PG_CID" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < docker/postgres/initdb/01-extensions.sql >/dev/null
    break
  fi
  sleep 2
done
if [ -z "${PG_CID:-}" ]; then echo "FALHA: postgres não subiu" >&2; exit 1; fi

# --- Migrations (Prisma) — ativa quando apps/api/prisma/migrations existir ---
if compgen -G "apps/api/prisma/migrations/*" > /dev/null; then
  DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
  echo "==> prisma migrate deploy"
  docker run --rm --network "${STACK}_medflow_net" \
    -e DATABASE_URL="$DB_URL" \
    "ghcr.io/medicalflow-team/medicalflow-monorepo-api:$TAG" \
    bunx prisma migrate deploy
else
  echo "==> sem migrations ainda — pulando"
fi

# --- Aguarda a API ficar saudável (healthcheck via container, independe de DNS) ---
# Usa a task MAIS RECENTE: com update_config start-first a task antiga (versão
# antiga) continua saudável durante o rollout e mascararia um boot quebrado.
echo "==> aguardando /api/health..."
NEWEST_CID() {
  for c in $(docker ps -qf 'name='"$1"); do
    echo "$(docker inspect -f '{{.State.StartedAt}}' "$c") $c"
  done | sort -r | head -1 | awk '{print $2}'
}
for i in $(seq 1 60); do
  API_CID="$(NEWEST_CID "${STACK}_api")"
  if [ -n "$API_CID" ]; then
    RUNNING_TAG="$(docker inspect -f '{{.Config.Image}}' "$API_CID" 2>/dev/null | sed 's/.*://')" || RUNNING_TAG=""
    if docker exec "$API_CID" bun -e \
      'fetch("http://127.0.0.1:3000/api/health").then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))' \
      2>/dev/null; then
      if [ "$RUNNING_TAG" = "$TAG" ]; then
        echo "==> OK após ${i} tentativa(s) (imagem :$TAG confirmada em execução):"
        docker exec "$API_CID" bun -e \
          'fetch("http://127.0.0.1:3000/api/health").then(r=>r.json()).then(j=>console.log(JSON.stringify(j)))'
        exit 0
      fi
      # Saudável mas ainda na imagem anterior: com update_config start-first a
      # task VELHA responde enquanto a nova ainda puxa — esperamos a tag certa
      # em vez de falhar na primeira resposta (run 36372580830: falhou em 1,6s,
      # antes de o pull da nova terminar).
      echo "   ...aguardando :$TAG (task atual ainda na :$RUNNING_TAG)"
    fi
  fi
  sleep 5
done

# Timeout — diagnostica qual dos dois casos reais:
API_CID="$(NEWEST_CID "${STACK}_api")"
RUNNING_TAG=""
if [ -n "$API_CID" ]; then
  RUNNING_TAG="$(docker inspect -f '{{.Config.Image}}' "$API_CID" 2>/dev/null | sed 's/.*://')" || RUNNING_TAG=""
fi
if [ "$RUNNING_TAG" != "$TAG" ]; then
  echo "FALHA: 300s e a imagem rodando continua '$RUNNING_TAG' (esperada '$TAG')." >&2
  echo "       Rollout não progrediu — pull falhou ou foi revertido. Veja:" >&2
  echo "       docker service ps ${STACK}_api --no-trunc" >&2
else
  echo "FALHA: imagem :$TAG está rodando mas /api/health não ficou OK em 300s." >&2
  echo "       Veja: docker service logs ${STACK}_api" >&2
fi
exit 1
