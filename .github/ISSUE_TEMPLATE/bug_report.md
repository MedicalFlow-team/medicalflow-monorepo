---
name: Relatar bug
about: Registrar comportamento incorreto ou regressão reproduzível
title: "[BUG] "
labels: ["bug"]
assignees: ""
---

## Contexto

Descreva onde o problema acontece e quem é afetado.

## Passos para reproduzir

1. Acessar ou executar `...`.
2. Informar `...`.
3. Observar `...`.

## Resultado atual

Descreva o comportamento observado. Inclua código HTTP, mensagem de erro ou evidência sem expor dados clínicos, credenciais ou outros dados sensíveis.

## Resultado esperado

Descreva o comportamento correto e, quando existir, informe o contrato ou critério relacionado.

## Rastreabilidade

- Requisitos (`RF-*`/`RNF-*`) relacionados:
- Casos de teste (`CT-*`) existentes ou que precisam ser criados:
- Seções ou endpoints de `docs/API_CONTRACT.md` relacionados:

## Área afetada

- [ ] Backend (`apps/api`: Elysia, Prisma, PostgreSQL)
- [ ] Frontend (`apps/web`: Next.js)
- [ ] Infraestrutura, CI/CD ou deploy
- [ ] Banco de dados ou migration
- [ ] Documentação ou contrato

## Ambiente

- Ambiente: local / staging / produção
- Versão, commit ou branch:
- Navegador, sistema ou dispositivo, quando aplicável:

## Impacto e frequência

- Frequência: sempre / intermitente / uma vez
- Impacto para pessoas usuárias ou operação:
- Existe contorno temporário?

## Evidências

Adicione logs sanitizados, imagens ou passos adicionais necessários para confirmar a correção.

## Critérios para encerrar

- [ ] A causa foi corrigida ou o comportamento esperado foi restaurado.
- [ ] Existe validação reproduzível para o cenário reportado.
- [ ] Não houve regressão conhecida nos fluxos afetados.
