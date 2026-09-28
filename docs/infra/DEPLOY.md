# Deploy — MedicalFlow

Pipeline GitHub → GHCR → Docker Swarm. **Commit na main = deploy em produção** (não existe staging por decisão do time).

## Fluxo

```text
push na main
  → CI (.github/workflows/ci.yml) roda antes nos PRs
  → deploy.yml: build api+web → push GHCR (sha + latest)
  → SSH no VPS → git pull → infra/deploy.sh <sha>
      → docker stack deploy --with-registry-auth
      → prisma migrate deploy (quando BE-02 criar as migrations)
      → aguarda /api/health → falha o job se não subir
```

## Setup único (já feito no VPS)

1. **Repo clonado** em `/root/medicalflow-monorepo` (pipeline faz `git pull --ff-only`).
2. **`/root/medflow/.env`** — variáveis de produção (ver SECRETS.md).
3. **Rede `traefik-public`** — já existe (mesma do WAHA/traefik).
4. **Secrets do GitHub** (Settings → Secrets and variables → Actions):
   - `MEDFLOW_VPS_HOST` — IP do VPS
   - `MEDFLOW_VPS_SSH_KEY` — chave privada SSH (root)

## GHCR (pull das imagens)

- Enquanto o repo/packages forem **públicos**: nenhum login necessário no VPS.
- Se ficarem **privados**: uma vez por VPS, `docker login ghcr.io` com um PAT (escopo `read:packages`). O `--with-registry-auth` do deploy distribui a credencial aos nodes.

## DNS (pendente)

Traefik emite certificado via **HTTP-01** — os registros precisam ser **DNS-only (nuvem cinza)** no Cloudflare (zona `selbr.com`):

| Registro | Tipo | Valor |
|---|---|---|
| `medflow.selbr.com` | A | IP do VPS |
| `api.medflow.selbr.com` | A | IP do VPS |

Sem isso, traefik não cria os routers na prática (health da stack segue válido via rede interna).

## Operação

```bash
docker stack ls                                 # stacks do swarm
docker service ls | grep medflow                 # estado dos 3 serviços
docker service logs medflow_api -f              # logs estruturados (JSON)
docker service ps medflow_api                   # tasks/restarts
docker exec -it $(docker ps -qf name=medflow_postgres) psql -U medflow -d medflow  # psql
```

## Deploy manual (emergência)

```bash
cd /root/medicalflow-monorepo
git pull --ff-only
bash infra/deploy.sh <tag>   # tag = sha do commit (ou latest)
```

## Layout

| Caminho | Papel |
|---|---|
| `stacks/medflow-stack.yml` | Stack de produção (postgres + api + web) |
| `docker-compose.dev.yml` | Dev local (postgres + api hot-reload) |
| `infra/deploy.sh` | Deploy usado pelo pipeline |
| `infra/backup/backup-postgres.sh` | Backup diário (cron 03:00) |
| `infra/monitoring/check-health.sh` | Alerta de saúde/WAHA (cron */5) |
| `docs/infra/` | SECRETS.md, WAHA.md, MONITORING.md, BACKUP.md |
