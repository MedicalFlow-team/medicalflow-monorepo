# MedicalFlow

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
