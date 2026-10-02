# Segredos & ambiente

**Regra:** nenhum valor real de produção entra no repo. O modelo é um `.env` por máquina + `.env.example` (commitado) como documentação viva.

## Onde vive o quê

| Local | Conteúdo |
|---|---|
| `.env.example` (repo) | Nome de todas as variáveis + valores fake/explicação |
| `/root/medflow/.env` (VPS) | Valores reais de produção, lido pela stack (`env_file`) |
| `apps/api/.env` (dev local) | Valores de dev (postgres local etc.) — gitignored |
| GitHub Secrets | `MEDFLOW_VPS_HOST`, `MEDFLOW_VPS_SSH_KEY` (só o pipeline usa) |

## Gerar valores fortes

```bash
openssl rand -hex 32   # JWT_SECRET, WAHA_WEBHOOK_SECRET
openssl rand -base64 24 # POSTGRES_PASSWORD
```

## Categorias

- **Postgres**: `POSTGRES_DB/USER/PASSWORD` + `DATABASE_URL` (host interno `medflow_postgres`).
- **API**: `JWT_SECRET` (auth §5 do contrato), `CORS_ORIGIN` (origem do front).
- **WAHA**: `WAHA_BASE_URL=http://waha:3000` (alias na rede traefik-public), `WAHA_API_KEY` (a mesma da stack waha — ver WAHA.md), `WAHA_WEBHOOK_SECRET` (valida o webhook §8).
- **Sintesy B2B**: `SINTESEY_MODE` (`mock` em dev; `b2b` em prod), `SINTESEY_B2B_API_KEY`, `SINTESEY_COST_PER_MIN_CENTS`.
- **gorouter**: `GOROUTER_BASE_URL` (alias `gorouter` na rede traefik-public), `GOROUTER_API_KEY`, `GOROUTER_MODEL`.

## Proteções ativas

1. **gitleaks no CI** — PR com segredo vaza = job falha.
2. `.gitignore` cobre `.env*` (exceto `.env.example`) em qualquer nível.
3. Nenhum segredo em imagem: tudo entra por `env_file` no runtime.
4. Rotação = editar `/root/medflow/.env` + `docker stack deploy` de novo (recreate dos serviços).

## Rotacionar em emergência

```bash
# JWT vazado:
vim /root/medflow/.env            # novo valor
cd /root/medicalflow-monorepo && bash infra/deploy.sh latest
# (tokens antigos morrem; todos logam de novo)
```
