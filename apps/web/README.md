# MedicalFlow Web

Frontend Next.js do MedicalFlow. Os fluxos de autenticação ficam em `/login`,
`/register`, `/verify-email`, `/forgot-password` e `/reset-password`.

Na raiz do monorepositório, instale as dependências com `bun install` e execute
`bun run dev:api` e `bun run dev:web` em terminais separados. O Route Handler
`/api/auth/[action]` encaminha as solicitações para a API. Em desenvolvimento,
o destino padrão é `http://127.0.0.1:3001/api`; ajuste `API_INTERNAL_URL` no
ambiente do servidor Next.js se a API estiver em outro endereço. Veja
`.env.example`. No stack, essa variável aponta para o serviço interno da API.

Após o login, o Route Handler guarda o token em um cookie HttpOnly e devolve
somente os dados necessários para escolher o próximo destino. Execute
`bun run lint`, `bun run typecheck`, `bun run test` e `bun run build` em
`apps/web` antes de integrar alterações.
