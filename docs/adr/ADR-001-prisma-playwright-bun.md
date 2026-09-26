# ADR-001: Prisma + Playwright/Chromium no Bun

## Objetivo

Avaliar Prisma e Playwright/Chromium no Bun (BE-01).

## Validado

- Bun, Elysia e `GET /health`.
- `prisma validate`, `prisma generate` e verificação de tipos.
- Configuração e teste de PDF A4 preparados, mas não executados.

## Pendente

- PostgreSQL real: conexão, migração e CRUD.
- Chromium e geração de PDF no container.
- As validações de PostgreSQL real e Chromium/PDF no container dependem da INF-02.

## Decisão provisória

Prisma permanece como opção atual; a compatibilidade com Playwright/Chromium no Bun aguarda validação. BE-01 **não está concluída**.