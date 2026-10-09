# Flowcare Web

Ambiente local validado com Bun 1.4.2. Os scripts de lint e typecheck usam
os pontos de entrada JavaScript das ferramentas para evitar os launchers
`.exe` bloqueados pelo Controle de Aplicativo do Windows.

Frontend Next.js do Flowcare. Os fluxos de autenticação ficam em `/login`,
`/register`, `/verify-email`, `/forgot-password` e `/reset-password`.
Em `/onboarding/profile`, a pessoa carrega e salva seu perfil inicial. Pode
salvar um rascunho e retomá-lo depois; a conclusão leva à página de chegada
da clínica, cuja configuração completa pertence à task #221.

Na raiz do monorepositório, instale as dependências com `bun install` e execute
`bun run dev:api` e `bun run dev:web` em terminais separados. As Server Actions
em `app/(auth)/actions.ts` validam entradas, chamam o Elysia e devolvem
resultados seguros à interface, sem uma camada intermediária de delegação. Copie
`apps/web/.env.example` para `apps/web/.env` e configure `API_INTERNAL_URL`.
Essa variável é obrigatória e fica apenas no servidor Next.js. Para a API,
copie `apps/api/.env.example` para `apps/api/.env` e configure as credenciais
e URLs locais. O `.env` da raiz configura o Compose. Veja
`docs/infra/SECRETS.md` para os valores usados pelo deploy.

Após o login, `server/session.ts` guarda o token em um cookie HttpOnly e a
action devolve somente os dados necessários para escolher o próximo
destino. Configuração privada e transporte HTTP ficam em `server/config.ts`
e `server/api-client.ts`. Todos esses módulos usam `server-only`.

`proxy.ts` aplica uma checagem otimista de presença da sessão nas rotas
`/app`, `/onboarding` e `/select-organization`, redirecionando visitantes
para `/login` com um `returnTo` interno. Quando já existe uma sessão, ele
redireciona as páginas públicas de autenticação para `/app`. Ele não valida
JWT nem permissões; essas decisões continuam no Elysia e nos services de
domínio.

O frontend não mantém rotas REST em `app/api`: os formulários importam as
Server Actions e o Next gerencia suas requisições POST. Essas ações continuam
sendo entradas remotas e validam dados no servidor. Endpoints públicos e
integrações de domínio permanecem na aplicação Elysia `apps/api`.

Execute
`bun run lint`, `bun run typecheck`, `bun run test` e `bun run build` em
`apps/web` antes de integrar alterações.
