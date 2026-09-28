# medflow-api

API do MedicalFlow — **ElysiaJS + Bun + TypeScript**. Contrato de rotas: [`docs/CONTRATOS_API.md`](../../docs/CONTRATOS_API.md) (fonte única).

## Rodar (dev)

```bash
cp ../../.env.example .env   # ajuste JWT_SECRET e DATABASE_URL para o Postgres local
cd ../..
bun install --frozen-lockfile
bun run dev:api              # http://localhost:3001/api/health
```

O Postgres local sobe via Docker na raiz do repo: `docker compose -f docker-compose.dev.yml up -d`.

## Testes / verificação

```bash
bun run --cwd apps/api test      # testes (bun:test)
bun run --cwd apps/api typecheck # tsc --noEmit (strict)
bun run --cwd apps/api lint      # biome check
```

## Estrutura

```
src/
  index.ts          # boot: loadEnv() → createApp(env).listen(PORT)
  app.ts            # app Elysia (prefixo /api) — createApp(env) p/ testes
  config/env.ts     # env tipado com fail-fast (variável obrigatória sem default)
  modules/          # rotas de negócio por domínio (BE-03+ criam aqui)
  lib/              # código compartilhado (normalize, formatters — BE-02+)
test/               # bun:test usando app.handle (sem abrir porta)
```

## Convenções (CONTRATOS_API.md)

- Toda resposta de erro usa o envelope `{ error: { code, message } }` (§1).
- Rotas declaradas com schema TypeBox — rota sem schema = PR recusado (BE-03).
- O app é montado por `createApp(env)`: nada de estado global de processo no código de rota.
