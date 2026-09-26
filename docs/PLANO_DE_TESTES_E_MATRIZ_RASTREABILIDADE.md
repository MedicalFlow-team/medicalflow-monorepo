# PLANO DE TESTES E MATRIZ DE RASTREABILIDADE DE REQUISITOS (RF)

**Projeto:** MedicalFlow — Sistema Integrado de Gestão de Agenda e Prontuário Clínico  
**Organização:** MedicalFlow-team  
**Responsável QA & Segurança:** Edimar Gabriel Marques Mina  
**Versão:** 1.0  
**Data:** 26 de Setembro de 2026  
**Status:** Baseline Aprovada  

---

## 1. Escopo do Plano de Testes

### 1.1 Objetivo
Definir a estratégia, governança, casos de teste e matriz de rastreabilidade para validação da conformidade técnica, funcional e de segurança do sistema MedicalFlow. O plano assegura cobertura completa para todos os Requisitos Funcionais priorizados como **Must Have** e **Should Have** (metodologia MoSCoW), garantindo estabilidade operacional para clínicas solo e pequenos consultórios, integridade dos dados médicos e estrita conformidade com a LGPD (Lei Geral de Proteção de Dados).

### 1.2 Delimitação de Escopo

#### Itens no Escopo (In-Scope — MVP 2026/2):
* **Módulo de Autenticação e Controle de Acesso (RBAC):** Gestão de sessões via tokens JWT, segregação de papéis (Médico, Recepcionista, Administrador) e proteção de endpoints.
* **Módulo de Gestão de Pacientes (Ficha 360°):** Cadastro de dados pessoais, vínculos de convênio/particular, histórico médico consolidado e buscas com paginação.
* **Módulo de Gestão de Agenda:** Grade diária e semanal com controle visual de status (`Agendado`, `Confirmado`, `Em Espera`, `Em Atendimento`, `Concluído`, `Cancelado`), detecção de conflitos de horário, encaixes operacionais e bloqueios de agenda.
* **Módulo de Prontuário Eletrônico do Paciente (PEP):** Linha do tempo cronológica contínua, anotações de evolução clínica estruturadas, garantia de imutabilidade pós-conclusão e repositório de anexos clínicos (PDF/JPG/PNG).
* **Módulo de Templates e Documentos Clínicos:** Gerenciamento de modelos com substituição de tags dinâmicas (*placeholders*), geração e exportação de laudos e receitas em formato PDF com cabeçalho institucional.
* **Módulo de Transcrição Inteligente de Voz:** Captura via Web Audio API, envio para pipeline de transcrição, extração direcionada por tópicos clínicos e revisão com aprovação manual pelo médico.
* **Segurança e Privacidade:** Sanitização de entradas contra injeções (SQL/NoSQL/XSS), criptografia de dados sensíveis em repouso e trânsito, e trilha de auditoria para registros médicos.

#### Itens Fora de Escopo (Out-of-Scope — Versões Futuras):
* Faturamento hospitalar e regras de glosa com operadoras no padrão TISS/TUSS.
* Integração com gateways pagos de telefonia/SMS corporativo (serão utilizados disparos por e-mail e webhooks).
* Assinatura digital via certificados ICP-Brasil com token físico/nuvem A3 (utiliza-se assinatura avançada baseada em hash SHA-256 e chave do sistema).
* Módulo de diagnóstico autônomo por IA (a IA atua estritamente como suporte redacional na transcrição de anamnese).
* Migração legada automatizada de bancos de dados hospitalares complexos (TASY/MV).

### 1.3 Níveis e Tipos de Teste Aplicados
1. **Testes Unitários:** Validação isolada de regras de domínio, funções utilitárias e parsers de tags via Vitest.
2. **Testes de Integração de API:** Validação de rotas HTTP/REST, persistência relacional (Prisma/SQLite/PostgreSQL), transações ACID e middlewares de autorização.
3. **Testes de Sistema / Ponta a Ponta (E2E):** Fluxos operacionais completos executados no navegador emulando ações de Médicos e Recepcionistas.
4. **Testes de Segurança e Privacidade (SecOps / LGPD):** Validação de vazamento de credenciais, quebra de autorização em nível de objeto (BOLA/IDOR), injeções de código e sanitização de logs.
5. **Testes de Usabilidade e Acessibilidade:** Conformidade do fluxo de 1 clique da grade para a ficha e legibilidade de status clínicos.

---

## 2. Requisitos Funcionais Priorizados e Critérios de Aceite (BDD)

### 2.1 Requisitos "Must Have" (Obrigatórios para o MVP)

#### [RF-01] [MUST] Autenticação e Controle de Acesso Baseado em Papéis (RBAC)
* **Descrição:** O sistema deve autenticar usuários via credenciais únicas (e-mail/senha) e fornecer tokens JWT com expiração, restringindo as ações de acordo com o perfil atribuído (`MEDICO`, `RECEPCIONISTA`, `ADMIN`).
* **Critérios de Aceite:**
  * **Cenário 1 (Sucesso):** *Dado* que um usuário ativo fornece credenciais válidas, *Quando* solicita login via `/api/auth/login`, *Então* recebe status HTTP 200, token JWT assinado e informações do seu perfil.
  * **Cenário 2 (Perfil Recepcionista bloqueado para Prontuário):** *Dado* que uma recepcionista autenticada tenta consultar os registros clínicos detalhados de evolução de um paciente em `/api/prontuarios/{id}`, *Quando* a requisição é disparada, *Então* o sistema retorna HTTP 403 Forbidden e registra o bloqueio em auditoria.
  * **Cenário 3 (Credenciais inválidas):** *Dado* um e-mail não cadastrado ou senha incorreta, *Quando* a tentativa de autenticação ocorre, *Então* retorna HTTP 401 Unauthorized sem especificar se o erro foi no e-mail ou na senha.

#### [RF-02] [MUST] Cadastro e Visão 360° do Paciente
* **Descrição:** O sistema deve manter o registro unificado do paciente, incluindo dados civis (Nome, CPF, Data de Nascimento, Telefone, E-mail), convênio (ou Particular) e histórico consolidado.
* **Critérios de Aceite:**
  * **Cenário 1 (Cadastro válido):** *Dado* um formulário preenchido com nome completo, CPF válido não duplicado e telefone, *Quando* a gravação for acionada, *Então* o paciente é registrado com status ativo e UUID único.
  * **Cenário 2 (CPF duplicado):** *Dado* que já existe um paciente com o CPF `123.456.789-00`, *Quando* outro cadastro tentar utilizar o mesmo documento, *Então* a operação é rejeitada com HTTP 409 Conflict e mensagem informativa.
  * **Cenário 3 (Consulta 360°):** *Dado* um paciente existente, *Quando* o médico acessa a sua ficha, *Então* o sistema renderiza em tela única seus dados demográficos, histórico de consultas anteriores e lista de alergias.

#### [RF-03] [MUST] Grade Dinâmica de Agendamento e Prevenção de Conflitos
* **Descrição:** A interface de agendamento deve apresentar visualização diária e semanal com slots de horários parametrizáveis, impedindo sobreposição de atendimentos para o mesmo profissional.
* **Critérios de Aceite:**
  * **Cenário 1 (Agendamento em horário vago):** *Dado* um intervalo disponível no dia 15/10/2026 às 14:00, *Quando* a recepcionista vincula um paciente ao médico, *Então* o agendamento é salvo no estado `Agendado` e o slot fica ocupado na grade.
  * **Cenário 2 (Bloqueio de sobreposição direta):** *Dado* que o Dr. Silva já possui consulta agendada para 15/10/2026 das 14:00 às 14:30, *Quando* uma tentativa de agendar outro paciente nesse mesmo intervalo é submetida, *Então* a transação é abortada com HTTP 400/409, alertando conflito de horário.

#### [RF-04] [MUST] Gestão de Ciclo de Vida e Status do Atendimento
* **Descrição:** Cada agendamento deve transitar ordenadamente entre os estados: `Agendado` ➔ `Confirmado` ➔ `Em Espera` ➔ `Em Atendimento` ➔ `Concluído` (ou `Cancelado` a qualquer momento anterior à conclusão).
* **Critérios de Aceite:**
  * **Cenário 1 (Transição regular de fluxo):** *Dado* um paciente com status `Em Espera`, *Quando* o médico clica em "Iniciar Atendimento", *Então* o status migra para `Em Atendimento`, o timestamp inicial é gravado e o prontuário é aberto.
  * **Cenário 2 (Bloqueio de transição inválida):** *Dado* uma consulta com status `Concluído`, *Quando* houver requisição para alterar o status para `Agendado`, *Então* a alteração deve ser rejeitada pelo servidor com HTTP 422 Unprocessable Entity.

#### [RF-05] [MUST] Prontuário Eletrônico e Linha do Tempo Cronológica
* **Descrição:** O sistema deve registrar a evolução médica do paciente em linha do tempo sequencial e imutável após finalização da consulta.
* **Critérios de Aceite:**
  * **Cenário 1 (Registro de evolução clínica):** *Dado* um atendimento em andamento, *Quando* o médico preenche a queixa principal, hipótese diagnóstica e conduta e finaliza o atendimento, *Então* a evolução é gravada com carimbo de data/hora e assinatura do médico (CRM).
  * **Cenário 2 (Garantia de imutabilidade):** *Dado* um registro de prontuário com status `Finalizado`, *Quando* uma requisição PUT/PATCH tentar alterar o texto da anotação, *Então* o sistema retorna HTTP 403/422 e impede a modificação.

#### [RF-06] [MUST] Segurança, Trilha de Auditoria e Conformidade LGPD
* **Descrição:** Toda operação de leitura ou escrita em dados clínicos e prontuários deve gerar registro de auditoria inalterável, contendo identificação do operador, timestamp e endereço IP.
* **Critérios de Aceite:**
  * **Cenário 1 (Auditoria de acesso ao prontuário):** *Dado* que um médico visualiza o prontuário do paciente X, *Quando* a resposta HTTP 200 é gerada, *Então* um evento de log de auditoria é persistido no banco contendo `user_id`, `action=VIEW_MEDICAL_RECORD`, `patient_id` e `timestamp`.
  * **Cenário 2 (Proteção de dados em trânsito e repouso):** *Dado* o tráfego de dados da aplicação, *Quando* inspecionado, *Então* todas as rotas operam sob HTTPS/TLS e as senhas de usuários utilizam hash criptográfico irreversível (bcrypt/argon2).

---

### 2.2 Requisitos "Should Have" (Alta Prioridade)

#### [RF-07] [SHOULD] Encaixes Operacionais e Bloqueios de Agenda
* **Descrição:** O sistema deve permitir a inclusão de atendimentos extras (encaixes) devidamente sinalizados visualmente e permitir o bloqueio de intervalos (almoço, congressos, férias).
* **Critérios de Aceite:**
  * **Cenário 1 (Criação de encaixe com justificativa):** *Dado* um horário já preenchido, *Quando* a recepção marca a flag "Encaixe" e informa a justificativa médica/urgência, *Então* a consulta é inserida com destaque visual (ícone de encaixe).
  * **Cenário 2 (Tentativa de agendamento em horário bloqueado):** *Dado* que o médico bloqueou a agenda das 12:00 às 13:30 para intervalo, *Quando* o sistema tentar alocar uma consulta padrão nessa faixa, *Então* o slot deve ser exibido como indisponível e a operação impedida.

#### [RF-08] [SHOULD] Repositório e Gestão de Anexos Clínicos (Exames e Laudos)
* **Descrição:** Permitir o upload de arquivos laboratoriais e relatórios médicos nos formatos PDF, JPG e PNG, associados à ficha do paciente, com validação de extensão e limite de tamanho.
* **Critérios de Aceite:**
  * **Cenário 1 (Upload válido de exame):** *Dado* um arquivo em formato `.pdf` de 5MB, *Quando* o médico realiza o upload na ficha do paciente, *Então* o arquivo é salvo no repositório de mídia, validado quanto ao MIME-type real e linkado à linha do tempo do paciente.
  * **Cenário 2 (Rejeição de arquivo malicioso ou não permitido):** *Dado* um arquivo executável `.exe` ou arquivo com extensão falsa, *Quando* o upload é submetido, *Então* o backend rejeita com HTTP 415 Unsupported Media Type antes da persistência.

#### [RF-09] [SHOULD] Gerenciador de Templates com Placeholders Dinâmicos
* **Descrição:** Permitir que o médico crie e edite modelos padronizados de receitas e atestados com substituição automática de dados do paciente e data.
* **Critérios de Aceite:**
  * **Cenário 1 (Renderização de tags):** *Dado* um template contendo a tag `{{paciente_nome}}` e `{{data_atual}}`, *Quando* o médico seleciona esse template para o paciente "Carlos Eduardo", *Então* o sistema substitui os campos automaticamente pelo nome real e a data formatada no texto final.
  * **Cenário 2 (Salvamento de novo template):** *Dado* um texto modelo criado pelo médico, *Quando* salvo com o título "Atestado 3 Dias", *Então* ele passa a estar disponível na listagem de modelos reutilizáveis.

#### [RF-10] [SHOULD] Emissão e Exportação de Documentos Clínicos em PDF
* **Descrição:** Gerar documentos clínicos padronizados prontos para impressão ou envio digital, contendo dados institucionais da clínica, assinatura e identificação do médico.
* **Critérios de Aceite:**
  * **Cenário 1 (Geração de PDF de receituário):** *Dado* um receituário preenchido e confirmado pelo médico, *Quando* clicado em "Gerar PDF", *Então* o sistema compila o arquivo PDF contendo layout médico oficial, cabeçalho da clínica, dados do paciente, posologia legível e dados do prescritor (CRM).
  * **Cenário 2 (Consistência do download):** *Dado* a requisição de download de documento emitido, *Quando* o arquivo é transferido, *Então* o cabeçalho `Content-Type: application/pdf` é retornado e o documento abre sem corrupção.

#### [RF-11] [SHOULD] Transcrição e Sumarização de Anamnese por Voz
* **Descrição:** Capturar áudio da consulta via navegador e gerar automaticamente minutas de texto estruturadas divididas nas seções: Queixa Principal, Sintomas e Conduta.
* **Critérios de Aceite:**
  * **Cenário 1 (Processamento de áudio com sucesso):** *Dado* um áudio capturado de 60 segundos com relato clínico do paciente, *Quando* o envio para transcrição é concluído, *Então* os campos da anamnese são pré-preenchidos nos tópicos correspondentes para conferência do médico.
  * **Cenário 2 (Aprovação médica obrigatória):** *Dado* o texto transcrito pelo assistente, *Quando* exibido em tela, *Então* nenhuma informação é salva permanentemente no prontuário até que o médico clique no botão explícito "Revisar e Gravar".

#### [RF-12] [SHOULD] Navegação Ágil e Acesso Rápido "1 Clique" Grade ➔ Ficha 360°
* **Descrição:** A partir do card de agendamento na grade diária, disponibilizar transição instantânea de contexto para a ficha clínica integral do paciente.
* **Critérios de Aceite:**
  * **Cenário 1 (Navegação contextual em 1 clique):** *Dado* um paciente agendado visível na grade de hoje, *Quando* o médico clica no atalho da ficha ou card, *Então* a rota transiciona diretamente para a Ficha 360° daquele paciente mantendo o contexto do atendimento ativo.

---

## 3. Especificação dos Casos de Teste Detalhados

| ID do Caso | Requisito | Título do Teste | Tipo | Severidade |
| :--- | :--- | :--- | :--- | :--- |
| **CT-01** | RF-01 | Autenticação com credenciais válidas (Médico e Recepcionista) | Funcional (Positivo) | Alta |
| **CT-02** | RF-01 | Rejeição de login com senha incorreta ou usuário inexistente | Funcional (Negativo) | Alta |
| **CT-03** | RF-01 | Validação de expiração e integridade do token JWT | Segurança | Crítica |
| **CT-04** | RF-01 | Bloqueio de autorização RBAC (Recepcionista acessando Prontuário) | Segurança (BOLA/RBAC) | Crítica |
| **CT-05** | RF-02 | Cadastro de novo paciente com campos obrigatórios íntegros | Funcional (Positivo) | Alta |
| **CT-06** | RF-02 | Bloqueio de cadastro de paciente com CPF duplicado | Funcional (Borda/Negativo)| Média |
| **CT-07** | RF-02 | Validação de formato inválido de e-mail e telefone no cadastro | Funcional (Borda) | Média |
| **CT-08** | RF-02 | Carregamento integral dos dados na Ficha 360° do Paciente | Funcional (Positivo) | Alta |
| **CT-09** | RF-03 | Agendamento de consulta em slot vago com sucesso | Funcional (Positivo) | Alta |
| **CT-10** | RF-03 | Prevenção de conflito de horário para o mesmo médico | Regra de Negócio | Crítica |
| **CT-11** | RF-03 | Alternância entre visualização diária e semanal da grade | Usabilidade / UI | Média |
| **CT-12** | RF-04 | Transição completa do ciclo de vida do atendimento | Funcional (Positivo) | Alta |
| **CT-13** | RF-04 | Bloqueio de cancelamento ou edição de consulta já concluída | Regra de Negócio | Alta |
| **CT-14** | RF-05 | Inclusão de evolução clínica no prontuário pelo médico | Funcional (Positivo) | Crítica |
| **CT-15** | RF-05 | Garantia de imutabilidade do registro de prontuário finalizado | Segurança / Integridade | Crítica |
| **CT-16** | RF-05 | Exibição cronológica correta dos atendimentos anteriores | Funcional | Média |
| **CT-17** | RF-06 | Registro automático de log de auditoria em consulta de prontuário | Auditoria / LGPD | Crítica |
| **CT-18** | RF-06 | Verificação de proteção de dados sensíveis e sanitização de logs | Segurança / LGPD | Crítica |
| **CT-19** | RF-06 | Teste de injeção SQL/NoSQL em rotas de busca de pacientes | Segurança (AppSec) | Crítica |
| **CT-20** | RF-07 | Cadastro de agendamento de encaixe operacional com justificativa | Regra de Negócio | Alta |
| **CT-21** | RF-07 | Bloqueio de novos agendamentos sobre intervalo reservado | Regra de Negócio | Média |
| **CT-22** | RF-08 | Upload de anexo de exame laboratorial em formato PDF válido | Funcional (Positivo) | Alta |
| **CT-23** | RF-08 | Rejeição de arquivo com formato executável ou MIME spoofing | Segurança | Alta |
| **CT-24** | RF-08 | Rejeição de arquivo com tamanho superior ao limite máximo (15MB) | Limite / Borda | Média |
| **CT-25** | RF-09 | Criação e salvamento de template clínico com placeholders | Funcional (Positivo) | Média |
| **CT-26** | RF-09 | Substituição dinâmica de tags no preenchimento do documento | Funcional | Alta |
| **CT-27** | RF-10 | Emissão e download de receituário médico em PDF formatado | Funcional / Integração | Alta |
| **CT-28** | RF-10 | Validação dos dados do profissional (CRM) e clínica no cabeçalho PDF | Funcional | Média |
| **CT-29** | RF-11 | Captura e envio de áudio para pipeline de transcrição | Integração | Média |
| **CT-30** | RF-11 | Mapeamento semântico da transcrição nos tópicos da anamnese | Funcional / IA | Média |
| **CT-31** | RF-11 | Exigência de confirmação manual do médico antes de gravar o prontuário | Regra de Negócio | Alta |
| **CT-32** | RF-12 | Acesso à Ficha 360° do paciente em 1 clique a partir da grade | Usabilidade / E2E | Média |

---

### 3.1 Detalhamento dos Procedimentos de Execução

#### CT-01: Autenticação com credenciais válidas
* **Pré-condições:** Usuário cadastrado no banco com perfil `MEDICO` ativo.
* **Passos de Execução:**
  1. Enviar requisição POST para `/api/auth/login` com payload `{"email": "medico@medicalflow.local", "senha": "SenhaValida123!"}`.
  2. Inspecionar o código de status HTTP e o corpo da resposta.
* **Resultado Esperado:** HTTP 200 OK; objeto JSON contendo `token` JWT assinado; payload do token decodificado contém `role: "MEDICO"`.

#### CT-04: Bloqueio de autorização RBAC (Recepcionista acessando Prontuário)
* **Pré-condições:** Usuário autenticado com perfil `RECEPCIONISTA`. Prontuário id `p-99` existente.
* **Passos de Execução:**
  1. Enviar requisição GET para `/api/prontuarios/p-99` anexando o cabeçalho `Authorization: Bearer <TOKEN_RECEPCIONISTA>`.
* **Resultado Esperado:** HTTP 403 Forbidden; mensagem de erro `"Acesso negado: Perfil sem permissão para acessar registros de prontuário"`; nenhum dado médico retornado.

#### CT-10: Prevenção de conflito de horário para o mesmo médico
* **Pré-condições:** Consulta agendada para o Dr. Silva em 20/10/2026 das 10:00 às 10:30.
* **Passos de Execução:**
  1. Submeter POST para `/api/agendamentos` com dados de outro paciente para o Dr. Silva em 20/10/2026 às 10:15.
* **Resultado Esperado:** HTTP 409 Conflict; transação no banco revertida (Rollback); agendamento existente mantido intacto sem sobreposição.

#### CT-15: Garantia de imutabilidade do registro de prontuário finalizado
* **Pré-condições:** Consulta com status `Concluído` e evolução gravada com id `evo-50`.
* **Passos de Execução:**
  1. Submeter requisição PUT para `/api/prontuarios/evolucoes/evo-50` com payload contendo alteração de texto do diagnóstico.
* **Resultado Esperado:** HTTP 422 Unprocessable Entity ou HTTP 403 Forbidden; o registro original permanece inalterado na base de dados.

#### CT-17: Registro automático de log de auditoria em consulta de prontuário
* **Pré-condições:** Médico autenticado com token válido.
* **Passos de Execução:**
  1. Realizar requisição GET para `/api/pacientes/pac-01/prontuario`.
  2. Consultar a tabela de logs de auditoria (`audit_logs`) no banco de dados.
* **Resultado Esperado:** Novo registro presente contendo `action: "READ_PRONTUARIO"`, `user_id: <id_do_medico>`, `patient_id: "pac-01"`, endereço IP do solicitante e timestamp exato.

#### CT-23: Rejeição de arquivo com formato executável ou MIME spoofing
* **Pré-condições:** Paciente selecionado na tela de anexos.
* **Passos de Execução:**
  1. Tentar upload de arquivo renomeado como `exame.pdf` contendo cabeçalho/conteúdo binário de arquivo PE (`.exe`) ou shell script.
* **Resultado Esperado:** O serviço de backend valida os *magic bytes* do arquivo; rejeita a operação com HTTP 415 Unsupported Media Type; o arquivo não é gravado em disco/S3.

---

## 4. Matriz de Rastreabilidade Bidirecional (RF ↔ Casos de Teste)

A tabela abaixo estabelece o vínculo formal entre cada Requisito Funcional priorizado no projeto e seus respectivos Casos de Teste implementados:

| Requisito Funcional | Título do Requisito | Prioridade MoSCoW | Casos de Teste Vinculados | Tipo de Cobertura | Status Cobertura |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **RF-01** | Autenticação e Controle de Acesso (RBAC) | **MUST** | CT-01, CT-02, CT-03, CT-04 | Funcional, Segurança, Permissões | 100% |
| **RF-02** | Cadastro e Visão 360° do Paciente | **MUST** | CT-05, CT-06, CT-07, CT-08 | Funcional, Validação de Dados | 100% |
| **RF-03** | Grade de Agendamento e Prevenção de Conflitos| **MUST** | CT-09, CT-10, CT-11 | Funcional, Integridade de Agenda | 100% |
| **RF-04** | Gestão de Ciclo de Vida do Atendimento | **MUST** | CT-12, CT-13 | Máquina de Estados, Negócio | 100% |
| **RF-05** | Prontuário Eletrônico e Linha do Tempo | **MUST** | CT-14, CT-15, CT-16 | Integridade Clínica, Imutabilidade | 100% |
| **RF-06** | Segurança, Trilha de Auditoria e LGPD | **MUST** | CT-17, CT-18, CT-19 | Auditoria, AppSec, Privacidade | 100% |
| **RF-07** | Encaixes Operacionais e Bloqueios de Agenda | **SHOULD** | CT-20, CT-21 | Regras Operacionais de Agenda | 100% |
| **RF-08** | Repositório de Anexos Clínicos (Exames) | **SHOULD** | CT-22, CT-23, CT-24 | Upload, Filtro MIME, Limites | 100% |
| **RF-09** | Gerenciador de Templates com Placeholders | **SHOULD** | CT-25, CT-26 | Processamento de Texto, Templates| 100% |
| **RF-10** | Emissão e Exportação de Documentos em PDF | **SHOULD** | CT-27, CT-28 | Exportação, Formatação Gráfica | 100% |
| **RF-11** | Transcrição e Sumarização de Anamnese (Voz)| **SHOULD** | CT-29, CT-30, CT-31 | Áudio, IA Redatora, Aprovação | 100% |
| **RF-12** | Acesso Rápido "1 Clique" Grade ➔ Ficha 360° | **SHOULD** | CT-32 | Usabilidade, Navegação E2E | 100% |

### Sumário da Cobertura:
* **Total de Requisitos Priorizados:** 12 (6 Must Have / 6 Should Have)
* **Total de Casos de Teste Mapeados:** 32 casos
* **Média de Casos por Requisito:** 2.67 casos/RF
* **Taxa de Rastreabilidade:** **100% dos Requisitos Must/Should cobertos por testes formais**

---

## 5. Critérios de Aceite Globais e Políticas de Qualidade

### 5.1 Critérios de Aceite da Release (DoD - Definition of Done)
Para que uma funcionalidade seja considerada concluída e aceita para a branch `main`:
1. **Rastreabilidade:** Deve estar associada a pelo menos um Requisito Funcional priorizado e coberta pelos respectivos casos de teste na matriz.
2. **Sucesso nos Testes:** 100% dos testes unitários e de integração vinculados devem executar com status verde (*passing*) na esteira de CI (`ci.yml`).
3. **Auditoria de Segurança:** Nenhuma vulnerabilidade de severidade Alta ou Crítica identificada nas dependências (`npm audit` / `snyk`) ou em code review de segurança.
4. **Conformidade de Acesso:** Endpoints de prontuário e dados médicos devem obrigatoriamente possuir middleware de autenticação JWT e validação de perfil médico.
5. **Code Review:** Aprovação mandatória de pelo menos um revisor (com bloqueio por Ruleset na branch `main`), sem conversas não resolvidas.

### 5.2 Critérios de Suspensão e Retomada dos Testes
* **Critério de Suspensão:** Os testes de homologação/E2E serão imediatamente suspensos se houver indisponibilidade persistente do banco de dados, falha crítica no middleware de autenticação (impossibilitando login) ou corrupção de schema do Prisma.
* **Critério de Retomada:** A execução é retomada após o deploy de hotfix comprovado via log de build limpo e restabelecimento das migrações do banco.

---

## 6. Governança, Ferramentas e Ambiente de Execução

| Camada / Função | Ferramenta Selecionada | Propósito no Plano |
| :--- | :--- | :--- |
| **Testes Unitários / Integração** | Vitest | Execução automatizada de asserções lógicas e testes de rotas Elysia |
| **Validação de Schemas e Modelos**| Prisma / TypeScript | Verificação estática de tipagem e integridade do banco relacional |
| **Automação de CI** | GitHub Actions (`.github/workflows/ci.yml`) | Execução de linters, testes e verificação de integridade a cada PR |
| **Segurança e Pentest de APIs** | OWASP ZAP / Burp Suite Community | Varredura de parâmetros, injeções e verificação de headers de proteção |
| **Gestão de Bugs e Rastreabilidade** | GitHub Issues / GitHub Projects v2 | Registro estruturado via template `bug_report.md` com vínculo ao CT |

---
**Assinatura Técnica:**  
*Edimar Gabriel Marques Mina — QA & Security Analyst*  
*MedicalFlow Software Factory — 2026/2*
