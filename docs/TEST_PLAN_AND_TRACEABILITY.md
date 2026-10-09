# Flowcare — Plano de Testes e Matriz de Rastreabilidade

**Versão:** 4.0
**Status:** Baseline de planejamento vNext
**Backlog:** [Flowcare - Delivery](https://github.com/orgs/Flowcare-team/projects/2)
**Contrato da API:** [`API_CONTRACT.md`](API_CONTRACT.md)

Este documento define a estratégia global de garantia de qualidade para o **Flowcare**, estabelecendo a matriz de rastreabilidade entre as decisões estratégicas de produto, as tarefas de desenvolvimento e as 15 issues formais de QA do projeto.

---

## 1. Cadeia de Rastreabilidade do Projeto

O fluxo de qualidade segue estritamente a cadeia:

```text
Decisão (#191–#197) → Issue de Entrega (BE/FE/INF) → Issue de QA (#214–#346) → Casos de Teste → Evidências no PR
```

---

## 2. Modelo de Qualidade e Camadas de Teste

| Camada | Localização e Responsabilidade |
|---|---|
| **Unidade (Unit)** | `apps/api`: validação de regras de domínio e serviços isolados; `apps/web`: utilitários e lógica de UI. |
| **Integração da API** | `apps/api/test`: execução das rotas Elysia via `app.handle(new Request(...))`, cobrindo schemas, hooks e tratamento de erros. |
| **Persistência** | Migrações Prisma/PostgreSQL, constraints de banco, integridade referencial, transações e isolamento multi-tenant. |
| **Contrato** | Validação de compatibilidade OpenAPI e schemas TypeBox entre a API e os consumidores frontend. |
| **Integração Frontend** | Next.js App Router, formulários, estados de carregamento, estados de erro e navegação baseada em URL. |
| **E2E (End-to-End)** | Jornadas completas do usuário cobrindo Web, API e dependências externas controladas (ex: WAHA / S3). |
| **Segurança e Privacidade** | Validação de autenticação, autorização granular RBAC, resistência a enumeração de contas e redação de logs. |
| **Operações e CI** | Validação de pipelines, rotinas de backup/restauração e deploy contínuo. |

### Comandos de Validação Automatizada
Para considerar uma alteração pronta para revisão, os seguintes comandos devem rodar sem erros a partir da raiz do monorepo:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

---

## 3. Invariantes Obrigatórios em Todos os Módulos

Todos os casos de teste devem validar os seguintes 8 invariantes globais:

1. **Isolamento Multi-tenant:** Um usuário validado na Organização A jamais consegue visualizar ou alterar dados da Organização B alterando o `orgSlug`, IDs ou parâmetros.
2. **Autorização Rígida:** Sessão ativa, pertinência à clínica (`Membership`) e permissão específica no RBAC são verificadas no servidor antes de qualquer consulta ou mutação.
3. **Minimização de Dados:** CPF, senhas, dados de contato, transcrições e textos médicos jamais aparecem em logs públicos ou URLs.
4. **Concorrência Otimista:** Alterações em recursos mutáveis validam o campo `version`, retornando `409 VERSION_CONFLICT` em caso de dados desatualizados.
5. **Idempotência:** Reenviar uma requisição com o mesmo cabeçalho `Idempotency-Key` não duplica registros ou ações no sistema.
6. **Respostas Estáveis:** Falhas esperadas seguem estritamente o envelope e os códigos de erro padronizados em `API_CONTRACT.md`.
7. **Auditabilidade:** Ações sensíveis e alterações de dados geram registros imutáveis de auditoria com a identificação do autor.
8. **Acessibilidade:** As jornadas no frontend garantem suporte completo a navegação por teclado, foco visual claro e leitores de tela.

---

## 4. Matriz de Rastreabilidade de QA

A tabela a seguir relaciona as **15 Issues Oficiais de QA** do board com seus módulos, issues de desenvolvimento cobertas e identificadores dos casos de teste.

| Issue de QA | Módulo Funcional | Issues de Entrega Cobertas | Códigos de Casos de Teste |
|---|---|---|---|
| **[#214](https://github.com/Flowcare-team/flowcare-monorepo/issues/214)** | Autenticação & Sessões | #192, #207–#213 | `ID-01` a `ID-08` |
| **[#226](https://github.com/Flowcare-team/flowcare-monorepo/issues/226)** | Onboarding & Primeira Clínica | #193, #215–#219, #221–#225 | `ONB-01` a `ONB-07` |
| **[#235](https://github.com/Flowcare-team/flowcare-monorepo/issues/235)** | Organizações, Troca & Painel | #191, #197, #227–#234 | `ORG-01` a `ORG-07` |
| **[#249](https://github.com/Flowcare-team/flowcare-monorepo/issues/249)** | Agendamentos & Recepção | #236–#248 | `AGD-01` a `AGD-08` |
| **[#261](https://github.com/Flowcare-team/flowcare-monorepo/issues/261)** | Pacientes, Prontuário & Anexos | #250–#260 | `PAC-01` a `PAC-08` |
| **[#272](https://github.com/Flowcare-team/flowcare-monorepo/issues/272)** | Consultas, Áudio & Anamnese | #195, #262–#271 | `CON-01` a `CON-08` |
| **[#286](https://github.com/Flowcare-team/flowcare-monorepo/issues/286)** | Documentos, Versionamento & PDF | #195, #273–#285 | `DOC-01` a `DOC-09` |
| **[#294](https://github.com/Flowcare-team/flowcare-monorepo/issues/294)** | Modelos de Documentos | #287–#293 | `MOD-01` a `MOD-05` |
| **[#302](https://github.com/Flowcare-team/flowcare-monorepo/issues/302)** | Comunicações & WhatsApp (WAHA) | #196, #295–#301 | `MSG-01` a `MSG-06` |
| **[#313](https://github.com/Flowcare-team/flowcare-monorepo/issues/313)** | Configurações & Horários | #303–#312 | `CFG-01` a `CFG-06` |
| **[#326](https://github.com/Flowcare-team/flowcare-monorepo/issues/326)** | Equipe, Convites & RBAC Granular | #194, #314–#325 | `EQP-01` a `EQP-08` |
| **[#330](https://github.com/Flowcare-team/flowcare-monorepo/issues/330)** | Auditoria & Logs de Segurança | #327–#329 | `AUD-01` a `AUD-05` |
| **[#340](https://github.com/Flowcare-team/flowcare-monorepo/issues/340)** | Conta Pessoal & Sessões | #331–#333, #335–#339 | `CPT-01` a `CPT-06` |
| **[#345](https://github.com/Flowcare-team/flowcare-monorepo/issues/345)** | Navegação por URL, Abas & Sheets | #345 | `NAV-01` a `NAV-05` |
| **[#346](https://github.com/Flowcare-team/flowcare-monorepo/issues/346)** | Acessibilidade, Foco & Teclado | #346 | `ACS-01` a `ACS-05` |

---

## 5. Especificação dos Casos de Teste por Módulo

### 5.1. Autenticação & Sessões (Issue #214)
* **`ID-01`**: Validar cadastro de novo usuário com e-mail único e envio de e-mail de confirmação.
* **`ID-02`**: Impedir login de usuário com e-mail não confirmado (`401 ACCOUNT_NOT_VERIFIED`).
* **`ID-03`**: Confirmar e-mail com token válido e liberar login na plataforma.
* **`ID-04`**: Garantir resistência a enumeração no fluxo de recuperação de senha.
* **`ID-05`**: Redefinir senha com token válido e certificar que todas as sessões anteriores foram invalidadas.
* **`ID-06`**: Invalidação imediata da sessão ao executar logout.
* **`ID-07`**: Impedir o uso de JWTs sem data de expiração (TTL finito obrigatório).
* **`ID-08`**: Garantir bloqueio de IP/conta por Rate Limit após múltiplas tentativas inválidas de login (`429 RATE_LIMITED`).

### 5.2. Onboarding & Primeira Clínica (Issue #226)
* **`ONB-01`**: Salvar e recuperar o progresso do onboarding em caso de desconexão.
* **`ONB-02`**: Impedir o avanço para o dashboard sem preencher dados obrigatórios do perfil e da clínica.
* **`ONB-03`**: Criar a primeira clínica gerando o `slug` único e o vínculo de `ADMIN` para o criador.
* **`ONB-04`**: Testar reenvio do formulário de criação da clínica utilizando o mesmo `Idempotency-Key` (deve retornar a clínica sem duplicar registro).
* **`ONB-05`**: Configurar regras padrão de horário semanal da clínica.
* **`ONB-06`**: Convidar membros da equipe durante a etapa de onboarding.
* **`ONB-07`**: Concluir o onboarding e redirecionar corretamente para a URL do dashboard (`/app/:orgSlug/dashboard`).

### 5.3. Organizações & Alternância de Contexto (Issue #235)
* **`ORG-01`**: Listar apenas as clínicas onde o usuário possui `Membership` ativo.
* **`ORG-02`**: Alternar contexto de clínica e validar atualização imediata de permissões no frontend e backend.
* **`ORG-03`**: Bloquear acesso a `/organizations/:orgSlug` para usuários não vinculados à clínica (`403 PERMISSION_DENIED`).
* **`ORG-04`**: Garantir que as métricas do painel exibam exclusivamente os dados da clínica selecionada no contexto.
* **`ORG-05`**: Impedir vazamento de contagens ou dados da Organização A ao consultar agregados na Organização B.
* **`ORG-06`**: Tentar acessar rota organizacional com `Membership` suspenso/inativo (`403 MEMBERSHIP_INACTIVE`).
* **`ORG-07`**: Atualizar preferências da clínica com controle de concorrência (`version`).

### 5.4. Agendamentos & Recepção (Issue #249)
* **`AGD-01`**: Reservar horário na agenda e impedir agendamentos sobrepostos no mesmo médico/sala (`409 SLOT_CONFLICT`).
* **`AGD-02`**: Testar idempotência na criação de agendamentos.
* **`AGD-03`**: Cancelar agendamento exigindo justificativa textual (bloquear se campo estiver vazio).
* **`AGD-04`**: Atualizar o status da fila de recepção (`CHEGOU`, `EM_ATENDIMENTO`, `CONCLUIDO`).
* **`AGD-05`**: Validar remarcação de consulta atualizando data e mantendo o histórico de alterações.
* **`AGD-06`**: Confirmar agendamento via integração de recepção.
* **`AGD-07`**: Filtrar agenda por profissional, intervalo de datas ou status.
* **`AGD-08`**: Garantir que médicos só visualizem agendamentos conforme suas permissões de papel.

### 5.5. Pacientes, Prontuário & Anexos (Issue #261)
* **`PAC-01`**: Cadastrar paciente e alertar duplicidade de CPF.
* **`PAC-02`**: Buscar pacientes por nome, CPF ou telefone com resposta paginada rápida.
* **`PAC-03`**: Atualizar dados cadastrais do paciente validando concorrência (`version`).
* **`PAC-04`**: Upload de arquivo de exame para o prontuário em bucket de armazenamento privado.
* **`PAC-05`**: Garantir que links de anexos do paciente sejam assinados e temporários (bloqueio de acesso público direto).
* **`PAC-06`**: Renderizar a linha do tempo (timeline) do prontuário em ordem cronológica reversa.
* **`PAC-07`**: Impedir que usuários de outra clínica consultem prontuários de pacientes.
* **`PAC-08`**: Garantir redação de CPF e telefone nos logs do servidor.

### 5.6. Consultas Clínicas, Áudio & Anamnese (Issue #272)
* **`CON-01`**: Iniciar atendimento vinculado ao agendamento e paciente.
* **`CON-02`**: Exigir confirmação de consentimento antes de permitir o envio do áudio gravado.
* **`CON-03`**: Processar transcrição do áudio sem duplicar chamadas de IA via chave de idempotência.
* **`CON-04`**: Salvar rascunho de anamnese e verificar bloqueio contra sobrescrita simultânea por concorrência otimista.
* **`CON-05`**: Aprovar anamnese registrando autoria médica e data/hora oficial.
* **`CON-06`**: Impedir edição de anamnese aprovada sem abertura de nota retificadora.
* **`CON-07`**: Testar resiliência no caso de falha de conexão durante o upload do áudio.
* **`CON-08`**: Garantir limpeza dos arquivos temporários de áudio no cliente após o envio.

### 5.7. Documentos Clínicos, Versionamento, Anulação & PDF (Issue #286)
* **`DOC-01`**: Criar rascunhos de receita simples, atestado, laudo e pedido de exame; recusar receita controlada e documento livre no MVP.
* **`DOC-02`**: Editar rascunho de documento enquanto estiver em status `DRAFT`.
* **`DOC-03`**: Emitir documento gerando snapshot imutável dos dados clínicos.
* **`DOC-04`**: Impedir qualquer edição em documento em status `ISSUED` ou `VOIDED` (`409 DOCUMENT_STATE_CONFLICT`).
* **`DOC-05`**: Gerar PDF para impressão e assinatura manuscrita a partir do snapshot e conferir layout/conteúdo; não apresentar como assinado eletronicamente.
* **`DOC-06`**: Anular documento emitido exigindo justificativa obrigatória.
* **`DOC-07`**: Validar que documento anulado exibe tarja visual de anulação e não pode ser re-emitido.
* **`DOC-08`**: Consultar histórico completo de versões do documento.
* **`DOC-09`**: Testar idempotência ao disparar a emissão do documento.

### 5.8. Modelos de Documentos (Issue #294)
* **`MOD-01`**: Cadastrar modelo de atestado com marcações automáticas (`{paciente_nome}`).
* **`MOD-02`**: Gerar prévia do modelo sem persistir documento clínico.
* **`MOD-03`**: Editar texto de modelo existente e certificar que documentos antigos emitidos com a versão prévia permanecem inalterados.
* **`MOD-04`**: Arquivar modelo e validar que ele deixa de aparecer na lista de criação de novos documentos.
* **`MOD-05`**: Impedir a criação de modelos com nomes duplicados na mesma clínica.

### 5.9. Comunicações & WhatsApp (Issue #302)
* **`MSG-01`**: Conectar sessão do WhatsApp via provedor WAHA e monitorar transição de status.
* **`MSG-02`**: Enfileirar confirmação de agendamento, cancelamento e lembrete de 24 horas apenas com opt-in ativo, sem bloquear o agendamento quando WAHA estiver indisponível.
* **`MSG-03`**: Processar webhook autenticado de entrega/leitura, incluindo eventos duplicados e fora de ordem.
* **`MSG-04`**: Reenviar apenas `FAILED` com `Idempotency-Key`; impedir nova cópia após aceite, entrega ou leitura.
* **`MSG-05`**: Configurar textos dos três eventos, recusando variáveis desconhecidas e conteúdo clínico.
* **`MSG-06`**: Tratar desconexão do WhatsApp alertando a equipe na interface.
* **`MSG-07`**: Revogar opt-in, impedir novos envios e cancelar mensagens ainda enfileiradas quando possível.

### 5.10. Configurações & Horários da Clínica (Issue #313)
* **`CFG-01`**: Atualizar dados institucionais, endereço e logotipo da clínica.
* **`CFG-02`**: Cadastrar horários de atendimento recorrentes por dia da semana.
* **`CFG-03`**: Adicionar bloqueio de agenda em datas comemorativas ou feriados.
* **`CFG-04`**: Configurar tópicos padrão de anamnese médica por profissional.
* **`CFG-05`**: Conferir segundos processados com sucesso, minutos derivados da soma, falhas sem consumo e detalhamento por profissional; não mostrar custo em R$ ou cota sem regra aprovada.
* **`CFG-06`**: Impedir alteração de configurações por usuários sem permissão `settings:write`.

### 5.11. Equipe, Convites & RBAC Granular (Issue #326)
* **`EQP-01`**: Enviar convite de equipe por e-mail e validar tempo de expiração do token.
* **`EQP-02`**: Aceitar convite via link e ingressar na clínica com o papel atribuído.
* **`EQP-03`**: Criar papel personalizado (ex: "Fisioterapeuta") marcando permissões específicas.
* **`EQP-04`**: Alterar o papel de um membro da equipe e validar atualização imediata de acesso.
* **`EQP-05`**: Impedir a exclusão ou rebaixamento do último administrador da clínica (`409 LAST_ADMIN_REQUIRED`).
* **`EQP-06`**: Remover membro da equipe e certificar que a sessão ativa dele é invalidada instantaneamente.
* **`EQP-07`**: Garantir que usuários com papéis restritos recebam `403 PERMISSION_DENIED` ao tentar acessar rotas protegidas.
* **`EQP-08`**: Testar concorrência na edição de papéis e membros.

### 5.12. Auditoria & Logs de Segurança (Issue #330)
* **`AUD-01`**: Registrar evento de auditoria ao emitir ou anular um documento clínico.
* **`AUD-02`**: Registrar log de segurança em tentativas frustradas de login ou acessos negados por RBAC.
* **`AUD-03`**: Filtrar logs de auditoria por data, usuário ou tipo de ação.
* **`AUD-04`**: Garantir que a tabela de audit logs seja estritamente Append-Only (impossível alterar ou deletar registros via API).
* **`AUD-05`**: Certificar que logs de auditoria omitem senhas, tokens e dados sensíveis.

### 5.13. Conta Pessoal & Sessões (Issue #340)
* **`CPT-01`**: Editar perfil pessoal (nome, foto) e refletir alterações em todas as clínicas associadas.
* **`CPT-02`**: Alterar senha exigindo a confirmação da senha atual.
* **`CPT-03`**: Listar todas as sessões ativas informando IP, navegador e última atividade.
* **`CPT-04`**: Encerrar uma sessão específica remotamente.
* **`CPT-05`**: Encerrar todas as outras sessões ativas em um único comando.
* **`CPT-06`**: Salvar preferências de notificação do usuário.

### 5.14. Navegação por URL, Abas & Sheets (Issue #345)
* **`NAV-01`**: Acessar rotas profundas diretamente via URL (ex: `/app/:orgSlug/patients/:patientId`) e carregar o recurso corretamente.
* **`NAV-02`**: Alternar entre abas do prontuário mantendo o estado dos formulários em edição.
* **`NAV-03`**: Abrir e fechar painéis modais (sheets/drawers) atualizando os parâmetros da URL sem recarregar a página.
* **`NAV-04`**: Utilizar os botões Voltar/Avançar do navegador mantendo a consistência do estado da UI.
* **`NAV-05`**: Tratar rotas inexistentes com tela padronizada de 404 mantendo a navegação da clínica ativa.

### 5.15. Acessibilidade, Foco & Teclado (Issue #346)
* **`ACS-01`**: Executar a jornada completa de agendamento e atendimento utilizando exclusivamente o teclado (Tab, Enter, Space, Esc).
* **`ACS-02`**: Garantir que modais e sheets prendem o foco de teclado (Focus Trap) enquanto estiverem abertos.
* **`ACS-03`**: Retornar o foco de teclado ao elemento de origem após fechar um modal.
* **`ACS-04`**: Garantir indicador de foco visual de alto contraste em todos os elementos interativos.
* **`ACS-05`**: Validar atributos ARIA e suporte a leitores de tela em formulários e tabelas.

---

## 6. Critérios de Bloqueio de Release (Release Gate)

Nenhuma alteração pode ser integrada à branch principal (`main`) ou implantada em produção se apresentar qualquer uma das seguintes condições:

- [ ] Qualquer teste automatizado (`bun run test`) apresentando falha.
- [ ] Erros de compilação ou tipagem (`bun run typecheck`).
- [ ] Violação nos testes de isolamento multi-tenant (acesso cruzado entre clínicas).
- [ ] Presença de credenciais, senhas, tokens ou dados de saúde em logs abertos.
- [ ] Inobservância do controle de concorrência ou falta de cabeçalho de idempotência em mutações críticas.
- [ ] Possibilidade de remover ou rebaixar o último administrador de uma organização.
