---
name: medicalflow-backend-ruan
description: Contexto operacional e técnico para trabalhar nas tasks de backend atribuídas a JuaDevBR no MedicalFlow. Use esta skill ao planejar, implementar, revisar, testar ou documentar qualquer task de backend de Ruan/JuaDevBR neste repositório.
---

# MedicalFlow — Backend JuaDevBR

## Papel

Atue como engenheiro de backend sênior auxiliando JuaDevBR no repositório:

`MedicalFlow-team/medicalflow-monorepo`

O sistema manipula dados clínicos. Trate privacidade, integridade, rastreabilidade, autorização e minimização de dados como requisitos de primeira classe.

Não altere trabalho de outras pessoas sem necessidade explícita. Em task exclusiva de backend de JuaDevBR, não altere frontend, infra, QA ou arquivos de outra task.

## Ordem de autoridade das fontes

Antes de implementar qualquer coisa, confira nesta ordem:

1. Issue original da task no GitHub.
2. Comentários técnicos mais recentes da issue.
3. `docs/CONTRATOS_API.md`, quando estiver vigente na `main`.
4. `docs/TASK_BREAKDOWN.md`.
5. `AGENTS.md` e skills do repositório, especialmente `$elysiajs`.
6. Esta skill.

Se houver conflito, nunca esconda a divergência. Aponte-a antes de escrever código.

Observação atual: o PR #67 contém uma versão nova de `docs/CONTRATOS_API.md` e do grafo de dependências. Enquanto ele não estiver mergeado, trate-o como especificação proposta referenciada pelas issues, não como conteúdo já presente na `main`.

## Stack e estrutura esperada

- Runtime: Bun.
- Linguagem: TypeScript estrito.
- Framework: ElysiaJS.
- ORM alvo do spike: Prisma 6 sobre PostgreSQL 16.
- Banco de desenvolvimento/integração: PostgreSQL 16 em container; não assumir SQLite.
- Contratos: Elysia schemas/TypeBox + `@elysiajs/openapi` + Eden Treaty.
- PDF: Playwright/Chromium headless.
- Testes: unitários e integração conforme padrão do projeto; usar Vitest quando a task/repo o definir.
- Infra: Docker/docker-compose e GitHub Actions.

Estrutura planejada pela INF-01:

```text
apps/
├── api/
└── web/
```

Padrão do backend planejado:

```text
apps/api/src/
├── modules/<dominio>/
├── lib/
└── plugins/
```

Não reorganize o repositório para essa estrutura antes da INF-01 entrar na `main`.

## Regras de Elysia

Sempre que criar, modificar, revisar ou depurar código ElysiaJS:

- use a skill `$elysiajs`;
- prefira padrões nativos do Elysia;
- não adapte padrões de Express automaticamente;
- não invente APIs do framework;
- mantenha schemas tipados por rota quando BE-03 estiver vigente.

## Tasks de JuaDevBR

### BE-01 — Issue #10 — Spike Prisma + Playwright/Chromium

Dependência:
- bloqueada por INF-01 (#2).

Objetivo:
- container Bun + Prisma 6 + PostgreSQL 16;
- `migrate dev` + query real;
- Playwright headless no mesmo container;
- HTML A4 → `page.pdf({ format: "A4" })`;
- medir tempo de boot;
- medir geração do PDF, alvo < 3 s para 2 páginas;
- medir RSS do Chromium;
- documentar libs de sistema necessárias;
- garantir `browser.close()` em `finally`;
- verificar ausência de processo Chromium órfão;
- concluir ADR-001 com decisão entre:
  - Prisma + Playwright no Bun;
  - fallback Drizzle;
  - worker Node apenas para PDF, se necessário.

Estado conhecido:
- existe spike anterior na branch `test/be-01-prisma-playwright`;
- ele usa estrutura `backend/` e Prisma 7;
- esse código deve ser adaptado depois da INF-01, não expandido agora como arquitetura definitiva.

### BE-02 — Issue #11 — Schema Prisma completo

Dependência:
- BE-01 (#10).

Implementar exatamente o modelo vigente em `docs/CONTRATOS_API.md` §14.
Não inventar campos sem alteração prévia do contrato.

Inclui SQL manual para:
- `unaccent`;
- `pg_trgm`;
- índice trigram;
- constraint de exclusão anti-sobreposição;
- partial unique de job de transcrição processando.

Seed inicial conforme issue.

Criar/usar `src/lib/normalize.ts` para normalização compartilhada.

Regra de migration:
- qualquer alteração de `schema.prisma` deve gerar e versionar migration correspondente;
- revisar a migration antes de commit;
- nunca subir mudança de schema isolada.

Fluxo seguro:
1. alterar schema;
2. `prisma generate`;
3. `prisma migrate dev`;
4. inspecionar migration;
5. testar;
6. revisar `git diff`;
7. só então commit/push.

### BE-03 — Issue #12 — OpenAPI + Eden Treaty

Dependência:
- BE-02 (#11).

Materializar `CONTRATOS_API.md` como código.

Regras:
- schemas TypeBox/Elysia por rota;
- `@elysiajs/openapi` em `/openapi.json`;
- Eden Treaty exportado em `apps/api/src/eden`;
- rota sem schema tipado é inválida;
- erros seguem `{ error: { code, message, details? } }`;
- mudança de contrato exige PR que atualize documentação e schema juntos.

### BE-04 — Issue #13 — ADR-002 Sintesy + ADR-003 PDF

Sem dependência técnica para documentação, mas exige alinhamento com responsável pelo Sintesy.

ADR-002 deve cobrir:
- API key B2B;
- header a decidir: `Authorization: Bearer <b2b-key>` ou `X-API-Key`;
- identificação de `clinicId` por request;
- `model=stt-low`;
- retorno mínimo `{ transcription, durationSeconds?, requestId }`;
- códigos de erro estáveis;
- medição por consumidor;
- rotação/revogação de key;
- rate limit;
- fallback `service_account`;
- mock determinístico.

ADR-003 registra a decisão do BE-01 sobre o renderizador.
Enquanto BE-01 não estiver concluída, manter decisão como proposta/pendente, não inventar conclusão.

Estado conhecido:
- PR #66 aberto;
- branch `be-04-sintesy-pdf-adrs`;
- alterar apenas se houver review ou nova fonte oficial.

### BE-13 — Issue #14 — Interpolação + snapshot + assinatura

Dependências:
- BE-02 (#11);
- BE-16 (#16).

Regras:
- resolver `{{entidade.campo}}` no momento da emissão;
- formatar valores para exibição;
- salvar snapshot completo imutável em `DocumentEmitted.snapshot`;
- renderizar o PDF a partir do snapshot;
- nunca re-renderizar documento emitido a partir do template atual;
- assinatura simples com nome, CRM e data/hora;
- gerar audit log `document.emit`;
- `POST /documents/emit` deve suportar `MISSING_REQUIRED_FIELDS`.

### BE-14 — Issue #15 — Renderizador PDF

Dependências:
- BE-01 (#10);
- BE-03 (#12).

Pipeline:
`BlockNote JSON → HTML com mesmo CSS do editor → Chromium → PDF A4`.

Regras:
- `printBackground: true`;
- fidelidade visual;
- multi-página;
- `browser.close()` em `finally`;
- sem processo órfão;
- alvo < 3 s/2 páginas, medido no BE-01;
- mesmo container do backend, salvo decisão contrária no ADR-001/003.

### BE-16 — Issue #16 — Catálogo de campos

Dependência:
- BE-02 (#11).

Catálogo fica em código, não em tabela.

Cada campo:
`{ key, label, group, requiredByDefault, requiredFor }`

`GET /fields-catalog` é fonte única para front e validação.

Campo novo exige atualização coordenada do catálogo e do contrato.

Campo opcional vazio não deve virar `undefined`, `null` ou `N/A` em PDF; deve simplesmente não aparecer.

### BE-17 — Issue #17 — SintesyClient

Dependências:
- BE-04 (#13);
- INF-05 (#6);
- BE-03 (#12).

Estrutura esperada:
`src/modules/transcription/sintesy/`

Regras:
- só esse módulo fala com Sintesy;
- auth B2B conforme ADR-002;
- fallback `service_account`;
- `SINTESEY_MODE=mock` com fixture determinística;
- `POST /sintesy/assistant/transcribe/`;
- multipart com MP3;
- `model=stt-low`;
- 3 tentativas com backoff 1s/4s/16s;
- após falha definitiva: `UPSTREAM_FAILURE` e job `falhou`;
- gravar `sintesyRequestId`;
- áudio temporário e nunca persistido no Sintesy;
- credenciais somente no backend.

Não inventar header/payload externo além do que ADR/documentação oficial confirmarem.

### BE-20 — Issue #18 — ExtractionProvider / gorouter

Dependências:
- BE-17 (#17);
- BE-22 (#31);
- INF-05 (#6).

Interface:
`extract(transcriptionText, topics): Promise<Record<string, string | null>>`

Implementação:
`GorouterExtractionProvider`

Config:
- `GOROUTER_API_KEY`;
- `GOROUTER_MODEL`.

Regras:
- schema JSON estrito;
- somente tópicos configurados;
- ausente = `null`;
- small talk descartado;
- proibir diagnóstico, tratamento e opinião clínica;
- validar JSON antes de persistir;
- se inválido: 1 retry com feedback;
- segunda falha: job falha com erro claro;
- trocar modelo deve ser configuração, não refatoração.

## Segurança, LGPD e integridade

Aplicar em toda implementação:

- nunca expor segredo/credencial no frontend;
- nunca logar token, senha, API key ou dado clínico bruto desnecessário;
- mascarar CPF/e-mail/telefone em logs quando aplicável;
- usar queries parametrizadas/Prisma, nunca SQL concatenado com entrada do usuário;
- senhas com hash seguro conforme contrato da task;
- HTTPS/TLS em produção;
- RBAC deve falhar com 403 quando não autorizado;
- acesso negado sensível deve ser auditável;
- upload deve validar tipo real/magic bytes, não só extensão;
- nunca vazar stack trace para o frontend;
- falha externa deve ficar rastreável e reenviável;
- operações críticas de concorrência devem usar proteção no banco quando possível;
- minimizar retenção de áudio e dados clínicos.

## Regras Git obrigatórias

- nunca `git push --force`;
- nunca `git push -f`;
- nunca push direto na `main`;
- trabalhar em branch própria da task;
- não alterar arquivos de task de outra pessoa sem alinhamento explícito;
- commits pequenos e Conventional Commits;
- abrir PR referenciando a issue;
- só mergear após review exigido;
- antes de push, revisar `git status` e `git diff`.

Há conflito documental atual:
- `CONTRIBUTING.md` ainda mostra `feature/<nome>`;
- branches recentes do time usam convenções diferentes;
- não renomear branches existentes nem impor `feature/` automaticamente.
Use a convenção atual combinada pela equipe para a task e preserve branches já criadas.

## CODEOWNERS e caminhos em transição

O `CODEOWNERS` atual ainda referencia `/backend/` e `/frontend/`, enquanto a INF-01 planeja `apps/api` e `apps/web`.

Portanto:
- trate o CODEOWNERS atual como configuração existente, não como prova de que a estrutura futura será `/backend/`;
- após a INF-01, confira se o CODEOWNERS foi atualizado;
- não altere CODEOWNERS por conta própria em task de backend funcional.

## Como trabalhar em cada task

Antes de escrever código:

1. reler a issue;
2. ler os comentários técnicos mais recentes;
3. confirmar dependências;
4. confirmar se a base necessária já foi mergeada na `main`;
5. consultar contrato vigente;
6. consultar `AGENTS.md` e `$elysiajs`;
7. propor arquitetura e arquivos a alterar;
8. limitar alterações ao escopo da task.

Durante a implementação:
- não inventar contratos;
- adicionar testes que cubram critérios de aceite;
- revisar migrations e diffs;
- apontar riscos de segurança/LGPD;
- manter integração externa desacoplada.

Antes do PR:
- validar build/typecheck/testes pertinentes;
- `git status`;
- `git diff`;
- garantir ausência de segredo;
- garantir que só arquivos do escopo foram alterados;
- resumir implementação conectando issue e critérios de aceite.

## OAuth / OIDC

O contrato atual do MedicalFlow usa login próprio por e-mail/senha e JWT, implementado em outra task de backend.

Não introduzir OAuth/OIDC sem decisão de arquitetura e atualização do contrato.

Se a equipe decidir adotar login federado:
- tratar autenticação de usuário como OpenID Connect sobre OAuth;
- preferir Authorization Code + PKCE;
- considerar BFF no Elysia para manter tokens fora do JavaScript do browser;
- evitar token OAuth em `localStorage` quando BFF/cookie HttpOnly for viável;
- `client_secret` nunca no frontend.

Para integração B2B externa, usar Client Credentials apenas se o provedor realmente oferecer esse contrato. Não substituir API key/service account do Sintesy por OAuth sem documentação oficial e atualização do ADR.
