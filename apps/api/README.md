# flowcare-api

API do Flowcare — **ElysiaJS + Bun + TypeScript**. Contrato de rotas: [`docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md) (fonte única).

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
  modules/          # rotas de negócio organizadas por domínio
  plugins/          # extensões do ciclo de requisição e da instância Elysia
  services/         # capacidades compartilhadas e integrações externas
  lib/              # funções puras e utilitários pequenos
test/               # bun:test usando app.handle (sem abrir porta)
```

## Convenções (`API_CONTRACT.md`)

- Toda resposta de erro usa o envelope `{ error: { code, message } }` (§1).
- Rotas declaram schemas Elysia/TypeBox nas fronteiras HTTP relevantes.
- O app é montado por `createApp(env)`: nada de estado global de processo no código de rota.
