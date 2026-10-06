# Deploy — Flowcare

Pipeline GitHub → GHCR → Docker Swarm. **Commit na main = deploy em produção** (não existe staging por decisão do time).

## Fluxo

```text
push na main
  → CI (.github/workflows/ci.yml) roda antes nos PRs
  → deploy.yml: build api+web → push GHCR (sha + latest)
  → SSH no VPS → git pull → infra/deploy.sh <sha>
      → docker stack deploy --with-registry-auth
      → prisma migrate deploy (quando houver migrations em apps/api/prisma/migrations)
      → aguarda /api/health → falha o job se não subir
```

## Setup único (já feito no VPS)

1. **Repo clonado** em `/root/flowcare-monorepo` (pipeline faz `git pull --ff-only`).
2. **`/root/flowcare/.env`** — variáveis de produção (ver SECRETS.md).
3. **Rede `traefik-public`** — já existe (mesma do WAHA/traefik).
4. **Secrets do GitHub** (Settings → Secrets and variables → Actions):
   - `FLOWCARE_VPS_HOST` — IP do VPS
   - `FLOWCARE_VPS_SSH_KEY` — chave privada SSH (root)

## GHCR (pull das imagens)

- Enquanto o repo/packages forem **públicos**: nenhum login necessário no VPS.
- Os pacotes no GHCR são **privados por padrão** (mesmo com repo público — visibilidade do pacote é independente). O deploy.yml resolve isso sozinho: faz `docker login ghcr.io` no VPS com o `GITHUB_TOKEN` efêmero do job (escopo `packages:write`, vale só durante o run) antes do `docker stack deploy`. Nenhuma credencial persistente é necessária.

## DNS

Zona `flowcare.me` (Cloudflare, já configurada):

| Registro | Tipo | Valor | Proxy |
|---|---|---|---|
| `flowcare.me` (apex) | A | IP do VPS | 🟠 proxied — edge HTTPS da CF (Universal SSL cobre apex + 1º nível); SSL mode **Full** |
| `www.flowcare.me` | A | IP do VPS | 🟠 proxied |
| `api.flowcare.me` | A | IP do VPS | ⚪ **DNS-only (cinza)** — o traefik emite cert Let's Encrypt direto. Motivo: o proxy CF limita request a 100 MB e o upload de áudio vai até 500 MB (RF-D2) |

- Apex e www: HTTP-01 atravessa o proxy Cloudflare normalmente (mesmo padrão de waha/train/stream) — requer SSL mode **Full ou Full (strict)** na zona; em **Flexible** causa redirect loop.
- Sem o registro `api.flowcare.me` (DNS-only), o cert da API não emite e a rota pública não existe.

## Operação

```bash
docker stack ls                                 # stacks do swarm
docker service ls | grep flowcare                 # estado dos 3 serviços
docker service logs flowcare_api -f              # logs estruturados (JSON)
docker service ps flowcare_api                   # tasks/restarts
docker exec -it $(docker ps -qf name=flowcare_postgres) psql -U flowcare -d flowcare  # psql
```

## Deploy manual (emergência)

```bash
cd /root/flowcare-monorepo
git pull --ff-only
bash infra/deploy.sh <tag>   # tag = sha do commit (ou latest)
```

## Layout

| Caminho | Papel |
|---|---|
| `stacks/flowcare-stack.yml` | Stack de produção (postgres + api + web) |
| `docker-compose.dev.yml` | Dev local (postgres + api hot-reload) |
| `infra/deploy.sh` | Deploy usado pelo pipeline |
| `infra/backup/backup-postgres.sh` | Backup diário (cron 03:00) |
| `infra/monitoring/check-health.sh` | Alerta de saúde/WAHA (cron */5) |
| `docs/infra/` | SECRETS.md, WAHA.md, MONITORING.md, BACKUP.md |
