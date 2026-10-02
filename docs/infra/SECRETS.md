# Segredos & ambiente

**Regra:** nenhum valor real de produção entra no repo. O modelo é um `.env` por máquina + `.env.example` (commitado) como documentação viva.

## Onde vive o quê

| Local | Conteúdo |
|---|---|
| `.env.example` (repo) | Nome de todas as variáveis + valores fake/explicação |
| `/root/medflow/.env` (VPS) | Valores reais de produção, lido pela stack (`env_file`) |
| `apps/api/.env` (dev local) | Valores de dev (postgres local etc.) — gitignored |
| `.env` (raiz, dev local) | Credenciais do Postgres e variáveis do Compose — gitignored |
| `apps/web/.env` (dev local) | `API_INTERNAL_URL`, acessível apenas no servidor Next.js — gitignored |
| GitHub Secrets | `MEDFLOW_VPS_HOST`, `MEDFLOW_VPS_SSH_KEY` (só o pipeline usa) |

## Gerar valores fortes

Copie os `.env.example` para `.env` em cada diretório. O exemplo da raiz
descreve produção; para desenvolvimento ajuste `NODE_ENV`, portas e URLs
para sua máquina. Mantenha a senha de `POSTGRES_PASSWORD`, `DATABASE_URL`
e `DOCKER_DATABASE_URL` consistente; use senha codificada para URL nas duas
strings de conexão. `DATABASE_URL` local aponta para localhost e
`DOCKER_DATABASE_URL` aponta para postgres. Se já existe um volume do
Postgres, configure a senha que esse banco já utiliza.

API exige `JWT_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, `WAHA_BASE_URL` e
`APP_WEB_URL`. O frontend exige `API_INTERNAL_URL`; nenhuma dessas variáveis
deve receber o prefixo `NEXT_PUBLIC_`.

Antes do próximo deploy, configure também `API_INTERNAL_URL`, `API_HOST`,
`WEB_HOST` e `WEB_ALT_HOST` em `/root/medflow/.env`, sem aspas. O script de
deploy exporta esses quatro valores para a interpolação da stack. Os hosts
são domínios sem protocolo; `APP_WEB_URL` é a URL pública completa usada nos
links de confirmação e recuperação. `SMTP_URL` e `MAIL_FROM` documentam a
futura integração SMTP; o mailer atual ainda escreve links no console.

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
