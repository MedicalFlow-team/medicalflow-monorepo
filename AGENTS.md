# Flowcare

## Backend

- O backend será desenvolvido com TypeScript, Bun, ElysiaJS e Prisma.
- Organize o backend preferencialmente por feature ou domínio.
- Mantenha tipagem TypeScript forte.
- Prefira padrões nativos do ElysiaJS; não adapte automaticamente padrões de Express.
- Não invente APIs do ElysiaJS.
- Para qualquer trabalho de backend, use a skill `$backend-engineer` instalada em `.agents/skills/backend-engineer`.
- Cada módulo de domínio em `apps/api/src/modules/<dominio>/` começa com `index.ts`, `model.ts` e `service.ts`.
- Coloque extensões do Elysia em `apps/api/src/plugins/` e capacidades compartilhadas ou integrações externas em `apps/api/src/services/`.

## ElysiaJS

- Sempre que criar, modificar, revisar ou depurar código ElysiaJS, use a skill `$elysiajs` instalada em `.agents/skills/elysia`.
- Antes de implementar APIs com ElysiaJS, consulte as instruções e referências relevantes dessa skill.
- Consulte a documentação oficial atual quando necessário, especialmente:
  - https://elysiajs.com/llms.txt
  - https://elysiajs.com/essential/best-practice
  - https://elysiajs.com/table-of-content

## Escopo das alterações

- Se a tarefa for exclusivamente de backend, não altere o frontend em `apps/web`.
- Antes de alterações grandes, explique brevemente o que será criado.

## Git, Commits & GitHub CLI

- Mensagens de commit, nomes de branch e títulos de PR DEVEM ser sempre em **inglês** seguindo Conventional Commits (`feat(scope): ... (#123)`).
- Para operações com GitHub (ler tasks, PRs, comentários, issues e CI), use a skill `$github-cli` instalada em `.agents/skills/github-cli`.
- **NUNCA faça merge de Pull Requests automaticamente**. Sempre abra o PR, aguarde a validação do CI e aguarde a análise e autorização explícita do usuário antes de realizar o merge.

## Produção & VPS

- Para qualquer operação, diagnóstico, verificação de logs ou rotina de produção, use a skill `$prod-access` instalada em `.agents/skills/prod-access`.
- NUNCA crie workflows descartáveis do GitHub Actions para rodar comandos na VPS; use sempre o SSH direto (`ssh root@209.126.11.124`).
