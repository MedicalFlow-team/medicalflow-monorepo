# MedicalFlow

## Backend

- O backend será desenvolvido com TypeScript, Bun, ElysiaJS e Prisma.
- Organize o backend preferencialmente por feature ou domínio.
- Mantenha tipagem TypeScript forte.
- Prefira padrões nativos do ElysiaJS; não adapte automaticamente padrões de Express.
- Não invente APIs do ElysiaJS.

## ElysiaJS

- Sempre que criar, modificar, revisar ou depurar código ElysiaJS, use a skill `$elysiajs` instalada em `.agents/skills/elysia`.
- Antes de implementar APIs com ElysiaJS, consulte as instruções e referências relevantes dessa skill.
- Consulte a documentação oficial atual quando necessário, especialmente:
  - https://elysiajs.com/llms.txt
  - https://elysiajs.com/essential/best-practice
  - https://elysiajs.com/table-of-content

## Escopo das alterações

- Se a tarefa for exclusivamente de backend, não altere o frontend em `medicalflow-web`.
- Antes de alterações grandes, explique brevemente o que será criado.
