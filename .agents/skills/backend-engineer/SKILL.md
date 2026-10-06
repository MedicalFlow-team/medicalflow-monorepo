---
name: backend-engineer
description: Implementar, revisar, testar e documentar o backend do Flowcare com TypeScript, Bun, ElysiaJS e Prisma. Use em qualquer trabalho dentro de apps/api ou que altere contratos, persistência, integrações e serviços do backend.
---

# Flowcare — Backend Engineer

Atue como engenheiro de backend no `Flowcare-team/flowcare-monorepo`. Esta skill vale para toda a equipe; não contém atribuições pessoais nem regras ligadas a uma issue específica.

O sistema manipula dados clínicos. Privacidade, isolamento por organização, autorização, integridade, auditoria e minimização de dados fazem parte da correção da implementação.

## Fontes de verdade

Antes de implementar, confira:

1. issue e comentários técnicos atuais;
2. `docs/API_CONTRACT.md` e ADRs vigentes;
3. `AGENTS.md`;
4. skill `$elysiajs` e documentação oficial atual quando houver código Elysia;
5. padrões já presentes em `apps/api`.

Se as fontes divergirem, exponha o conflito e preserve o contrato vigente até existir uma decisão explícita.

## Stack

- TypeScript estrito;
- Bun;
- ElysiaJS, usando seus padrões nativos;
- Prisma sobre PostgreSQL;
- schemas Elysia/TypeBox como fonte de validação e tipos de transporte;
- `bun:test` para os testes, salvo decisão registrada em contrário.

Não adapte automaticamente arquitetura de Express e não invente APIs do Elysia.

## Estrutura do backend

Organize por domínio:

```text
apps/api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── index.ts
│   ├── app.ts
│   ├── config/
│   ├── modules/
│   │   └── <dominio>/
│   │       ├── index.ts
│   │       ├── model.ts
│   │       └── service.ts
│   ├── plugins/
│   ├── services/
│   └── lib/
└── test/
```

Responsabilidades:

- `src/index.ts`: carrega configuração e inicia o servidor. Não contém regra de negócio.
- `src/app.ts`: compõe plugins e módulos e exporta a aplicação para execução e testes.
- `modules/<dominio>/index.ts`: instância Elysia do domínio, com prefixo, rotas, hooks locais e schemas aplicados. A instância Elysia é o controller HTTP.
- `modules/<dominio>/model.ts`: schemas de entrada, saída e erro do domínio com `t`; tipos derivam dos schemas, sem duplicação manual.
- `modules/<dominio>/service.ts`: regras de negócio do domínio, preferencialmente independentes de `Context`, Request e Response.
- `plugins/`: extensões do ciclo de requisição e da instância Elysia, como autenticação, autorização, tratamento de erro, OpenAPI, CORS e observabilidade.
- `services/`: capacidades compartilhadas entre domínios ou integrações de infraestrutura, como e-mail, arquivos, filas e clientes externos.
- `lib/`: funções puras e utilitários pequenos que não pertencem a um domínio nem mantêm recursos externos.
- `config/`: leitura e validação de configuração. Segredos permanecem no backend.

Comece cada feature com `index.ts`, `model.ts` e `service.ts`. Adicione arquivos como `repository.ts`, `errors.ts` ou submódulos apenas quando a complexidade real justificar; não crie camadas vazias.

## Regras de Elysia

- Trate uma instância `Elysia` como controller e preserve a inferência criada pelo encadeamento.
- Não passe o `Context` inteiro para services. Extraia somente os valores necessários na rota.
- Use schemas em todas as fronteiras HTTP relevantes: `body`, `params`, `query`, `headers`, `cookie` e `response`.
- Derive tipos dos schemas (`typeof schema.static` ou recurso equivalente confirmado na versão instalada).
- Para lógica dependente da requisição, use plugin, macro, guard ou resolve do Elysia conforme a documentação atual.
- Para lógica independente da requisição, use função ou service TypeScript desacoplado do framework.
- Dê `name` a plugins reutilizáveis quando a deduplicação do Elysia for necessária.
- Use `app.handle(new Request(...))` em testes de integração de rotas para executar o ciclo real do Elysia sem abrir porta.

## Domínio, persistência e integrações

- Módulos dependem de services compartilhados por interfaces pequenas e explícitas.
- Clientes de terceiros ficam isolados em `services/` ou dentro do módulo proprietário quando não são compartilhados.
- Queries sempre respeitam `organizationId` e as permissões do usuário autenticado.
- Use Prisma ou SQL parametrizado; nunca concatene entrada em SQL.
- Mudança em `schema.prisma` inclui migration revisada e validação correspondente.
- Operações concorrentes críticas devem usar garantias do banco quando possível.
- Integrações externas precisam de timeout, erro estável e rastreabilidade; retry só quando a operação for segura ou idempotente.

## Contratos e erros

- Preserve o envelope de erro definido em `docs/API_CONTRACT.md`.
- Mudança de endpoint, payload, status HTTP ou schema exige atualização coordenada do contrato e dos consumidores afetados.
- Não exponha stack trace, segredo ou dado clínico desnecessário.
- Não crie campos, permissões ou comportamentos fora da issue e do contrato vigente.

## Segurança

- Nunca registre senha, token, chave, áudio ou dado clínico bruto sem necessidade explícita.
- Valide autorização e organização no servidor, mesmo quando o frontend já filtra a ação.
- Acesso negado e operação clínica sensível devem produzir a auditoria prevista no contrato.
- Upload valida tamanho, conteúdo e tipo real, não apenas nome ou extensão.
- Falhe de forma fechada quando identidade, organização ou permissão não puderem ser comprovadas.

## Fluxo de trabalho

Antes de editar, delimite os módulos, contratos e migrations afetados. Preserve alterações não relacionadas de outras pessoas.

Durante a implementação:

- mantenha handlers curtos;
- concentre regra de negócio no service do domínio;
- reutilize plugins e services compartilhados;
- escreva testes que comprovem critérios de aceite, autorização, isolamento e casos de erro relevantes.

Antes de concluir, rode na raiz, conforme o escopo:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Revise `git status` e `git diff`, confirme que migrations e documentação acompanham a mudança e relate com precisão os comandos executados.
