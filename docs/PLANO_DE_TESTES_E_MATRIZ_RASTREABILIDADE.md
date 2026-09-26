# PLANO DE TESTES E MATRIZ DE RASTREABILIDADE DE REQUISITOS (RF)

**Projeto:** MedicalFlow — Sistema Integrado de Gestão de Agenda e Prontuário Clínico  
**Organização:** MedicalFlow-team  
**Repositório:** `MedicalFlow-team/medicalflow-monorepo`  
**Responsável QA & Segurança:** Edimar Gabriel Marques Mina (`@GabrielMarques1`)  
**Versão:** 2.0 (Alinhada às 61 Issues do Repositório e Épicos 1 a 7)  
**Data:** 26 de Setembro de 2026  
**Status:** Baseline Oficial de QA  

---

## 1. Escopo e Governança do Plano de Testes

### 1.1 Objetivo e Alinhamento com as Tarefas de QA
Este documento consolida a estratégia de qualidade, os casos de teste e a matriz de rastreabilidade bidirecional para o sistema MedicalFlow. O plano contempla cobertura integral dos Requisitos Funcionais (Must Have e Should Have) e responde diretamente às 10 issues atribuídas à frente de **QA & Security** no repositório (`QA-01` a `QA-10`, Épico 7):

* **[QA-01] (#52):** Plano de testes formal e matriz de rastreabilidade RF ↔ casos.
* **[QA-02] (#53):** E2E de RBAC (Médico vs. Recepcionista) e auditoria de tentativas bloqueadas.
* **[QA-03] (#54):** E2E de Agenda (concorrência no banco, 6 status visuais, encaixes operacionais e transição em 1 clique).
* **[QA-04] (#55):** E2E de Busca de Pacientes (normalização unaccent, pontuação CPF/telefone, debounce e mascaramento).
* **[QA-05] (#56):** E2E de WhatsApp / WAHA (confirmação automática via palavras-chave, fila manual de ambíguas e reconexão).
* **[QA-06] (#57):** E2E de Emissão/PDF (bloqueio amigável por dados faltantes, regressão visual preview BlockNote × PDF Chromium e snapshot imutável).
* **[QA-07] (#58):** E2E de Transcrição Inteligente (Sintesy `stt-low` + gorouter, descarte físico do áudio pós-sucesso e truncamento de 500 MB).
* **[QA-08] (#59):** Testes de Segurança e LGPD (criptografia em repouso/trânsito, bcrypt, minimização e auditoria).
* **[QA-09] (#60):** Termo e aviso de consentimento para uso de IA na transcrição clínica.
* **[QA-10] (#61):** Roteiro de homologação com clínica parceira, matriz de defeitos e plano de contingência para demo AV2.

---

### 1.2 Delimitação de Escopo Técnico

#### Módulos Cobertos (In-Scope):
1. **Épico 2 — Autenticação, RBAC e Sessão Segura (`RF-E1` a `RF-E6`):**
   * Sessão persistente via JWT, hashing de senhas com bcrypt, invalidação de tokens em alteração cadastral.
   * Controle de acesso baseado em papéis (RBAC): Médico com acesso irrestrito; Recepcionista restrita a agendamentos, cadastros civis e download de prescrições/laudos emitidos, sendo terminantemente bloqueada para anamneses e evoluções clínicas.
   * Registro obrigatório de tentativas de acesso desautorizado na trilha de auditoria (`audit_logs`).
2. **Épico 3 — Gestão de Agenda e Confirmação Automatizada (`RF-A1` a `RF-A8`):**
   * Grade diária e semanal com slots dinâmicos e controle dos 6 status: `Agendado`, `Confirmado`, `Em Espera`, `Em Atendimento`, `Concluído`, `Cancelado`.
   * Prevenção de sobreposição direta sob concorrência via constraints/exclusion rules transacionais no PostgreSQL.
   * Agendamento de encaixes operacionais com identificação visual destacada e criação de bloqueios de agenda médica.
   * Integração com cliente WAHA (WhatsApp): disparo de lembrete 24h antes, parsing de confirmações automáticas por palavras-chave (`SIM`, `1`, `CONFIRMO` vs. `NÃO`, `2`, `CANCELO`) e triagem de respostas ambíguas para a fila *"aguardando confirmação manual"*.
3. **Épico 4 — Ficha do Paciente 360° e Busca Normalizada (`RF-B1` a `RF-B5`):**
   * Ficha médica completa integrada em tela única com acesso em 1 clique a partir do card na grade.
   * Linha do tempo cronológica contínua contendo evolução, queixas e atendimentos pregressos.
   * Upload seguro de anexos laboratoriais (PDF e JPG) com validação de MIME type real e armazenamento isolado.
   * Busca incremental de pacientes com debounce de 250 a 300 ms, ignorando acentuação gráfica (`unaccent`) e caracteres de formatação de CPF e telefone, com exibição de CPF mascarado (`***.456.789-**`).
4. **Épico 5 — Templates e Documentos Clínicos (`RF-C1` a `RF-C10`):**
   * Editor de texto rico BlockNote A4 (WYSIWYG) com inserção de campos dinâmicos por chips.
   * Validação em 3 camadas: alerta de erro no salvamento do template, bloqueio amigável com botão "Corrigir dados" na emissão se faltar campo obrigatório (ex: CPF do paciente), e garantia de zero *placeholders* crus no documento final.
   * Renderizador de PDF via Chromium headless com snapshot imutável pós-emissão e assinatura digital simples (Nome, CRM, data/hora e hash de integridade).
5. **Épico 6 — Transcrição Inteligente e Sumarização por Voz (`RF-D1` a `RF-D12`):**
   * Captura de áudio no navegador com filtro redutor de ruídos, formato MP3 e limite de 500 MB (com corte e aviso de truncamento se excedido).
   * Integração com Sintesy B2B (modelo `stt-low`) e extração semântica direcionada via `gorouter` restrita aos tópicos configurados pelo médico (JSONB).
   * Proibição estrita de parecer diagnóstico autônomo pela IA (atuação exclusivamente como redatora estruturada).
   * **Descarte de Áudio Mandatório:** destruição física e irreversível do arquivo de áudio no servidor/storage imediatamente após a conclusão da transcrição.
   * Revisão lado a lado na UI com aprovação manual em 1 clique antes da persistência no prontuário.
   * Medição e auditoria de consumo em minutos e custos estimados por clínica.
6. **Épico 7 — Qualidade, Segurança e LGPD:**
   * Auditoria de operações em dados sensíveis, conformidade LGPD, termo de consentimento de IA e homologação com clínica parceira.

---

## 2. Especificação Detalhada dos Casos de Teste

| ID do Caso | Issue Ref | Requisito | Título do Caso de Teste | Tipo | Severidade |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **CT-01** | QA-02 | RF-E1 | Autenticação bem-sucedida com JWT e persistência de sessão | Funcional / Auth | Alta |
| **CT-02** | QA-02 | RF-E1/E4 | Rejeição de credenciais inválidas e invalidação pós-troca de senha | Segurança / Auth | Alta |
| **CT-03** | QA-02 | RF-E2 | Bloqueio RBAC: Recepcionista acessando anamnese/evolução clínica (403) | Segurança / RBAC | Crítica |
| **CT-04** | QA-02 | RF-E2/E5 | Registro em log de auditoria ao bloquear tentativa de acesso da recepcionista | Auditoria / LGPD | Crítica |
| **CT-05** | QA-02 | RF-E2 | Permissão RBAC: Recepcionista baixando prescrições e laudos emitidos | Funcional / RBAC | Alta |
| **CT-06** | QA-03 | RF-A1/A5 | Renderização da grade diária e semanal com os 6 status visuais | Interface / UI | Média |
| **CT-07** | QA-03 | RF-A4 | Rejeição de sobreposição concorrente de horários a nível de banco (Postgres) | Regra / Concorrência | Crítica |
| **CT-08** | QA-03 | RF-A2/A3 | Cadastro de encaixe operacional com sinalização sem sobrepor atendimento | Regra de Negócio | Alta |
| **CT-09** | QA-03 | RF-A3 | Bloqueio de agendamento em horário com intervalo médico reservado | Regra de Negócio | Média |
| **CT-10** | QA-03 | RF-A6 | Transição contextual em 1 clique da grade para a Ficha 360° do paciente | Usabilidade / E2E | Alta |
| **CT-11** | QA-04 | RF-B5 | Busca incremental de pacientes com debounce de 250–300 ms | Performance / UI | Média |
| **CT-12** | QA-04 | RF-B5 | Busca normalizada ignorando acentuação gráfica (unaccent) e caixa alta/baixa | Funcional / Busca | Alta |
| **CT-13** | QA-04 | RF-B5 | Busca por CPF com e sem máscara pontuada retornando o mesmo registro | Funcional / Busca | Alta |
| **CT-14** | QA-04 | RF-B5 | Exibição de CPF mascarado na listagem de resultados da busca (LGPD) | Privacidade / UI | Alta |
| **CT-15** | QA-04 | RF-B5 | Desambiguação de pacientes homônimos por data de nascimento e telefone | Usabilidade / Dados | Média |
| **CT-16** | QA-05 | RF-A8 | Disparo automático de lembrete de consulta 24h antes via WAHA | Integração / Job | Alta |
| **CT-17** | QA-05 | RF-A8 | Confirmação automática via WhatsApp com palavras-chave afirmativas (SIM, 1) | Integração / Regra | Alta |
| **CT-18** | QA-05 | RF-A8 | Cancelamento automático via WhatsApp com palavras-chave negativas (NÃO, 2) | Integração / Regra | Alta |
| **CT-19** | QA-05 | RF-A8 | Direcionamento de resposta ambígua para a fila "Aguardando confirmação manual"| Regra / Exceção | Alta |
| **CT-20** | QA-05 | RF-A8 | Tratamento de queda de sessão do WAHA com alerta visual e fila de pendentes | Resiliência / Infra | Alta |
| **CT-21** | QA-06 | RF-C1 | Renderização WYSIWYG no editor BlockNote A4 com inserção de chips dinâmicos | Interface / Editor | Média |
| **CT-22** | QA-06 | RF-C8 | Bloqueio amigável de emissão com "Corrigir dados" quando faltar campo obrigatório| Regra / Validação | Alta |
| **CT-23** | QA-06 | RF-C6/C10| Regressão visual e fidelidade entre o preview no editor e o PDF gerado | Interface / PDF | Alta |
| **CT-24** | QA-06 | RF-C7/C10| Garantia de snapshot imutável (edição posterior do template não altera o PDF) | Integridade / PEP | Crítica |
| **CT-25** | QA-06 | RF-C10 | Validação da assinatura simples do médico (CRM, nome, data e hash no PDF) | Conformidade Médica | Alta |
| **CT-26** | QA-07 | RF-D2 | Captura de áudio MP3 no navegador com filtro redutor de ruídos | Mídia / Frontend | Média |
| **CT-27** | QA-07 | RF-D2 | Truncamento automático de áudio superior a 500 MB com log e aviso ao usuário | Limite / Borda | Alta |
| **CT-28** | QA-07 | RF-D4/D6 | Filtragem de *small talk* e extração estrita nos tópicos configurados (JSONB) | IA / Sumarização | Alta |
| **CT-29** | QA-07 | RF-D6 | Bloqueio de inferência diagnóstica autônoma pela IA (estritamente redatora) | Segurança Clínica | Crítica |
| **CT-30** | QA-07 | RF-D8 | Resiliência a falhas do Sintesy: status `falhou` e reenvio manual sem perda | Resiliência / API | Alta |
| **CT-31** | QA-07 | RF-D12 | **Descarte obrigatório do áudio:** destruição física no storage pós-sucesso | Segurança / LGPD | Crítica |
| **CT-32** | QA-07 | RF-D5/D9 | Revisão lado a lado na UI e aprovação médica manual em 1 clique | Usabilidade / E2E | Alta |
| **CT-33** | QA-08 | RF-E3/E6 | Validação de criptografia TLS 1.3 em trânsito e hashing bcrypt no banco | Segurança / Infra | Crítica |
| **CT-34** | QA-08 | RF-E5 | Rastreabilidade e completude dos logs de auditoria em dados clínicos sensíveis| Auditoria / LGPD | Crítica |
| **CT-35** | QA-08 | RNF-5 | Testes de injeção (SQL/NoSQL) e blindagem contra vazamento de stack traces | AppSec / OWASP | Crítica |
| **CT-36** | QA-08 | RF-D10 | Medição e registro de consumo e custos por clínica sem bloqueio operacional | Regra de Negócio | Média |

---

## 3. Roteiros de Execução dos Casos Críticos

### CT-03 & CT-04: Bloqueio RBAC para Recepcionista e Auditoria (Issue QA-02)
* **Objetivo:** Garantir que o perfil `RECEPCIONISTA` seja impedido de visualizar prontuários e que o incidente seja registrado.
* **Passos:**
  1. Autenticar no sistema com usuário de perfil `RECEPCIONISTA`.
  2. Disparar GET para `/api/pacientes/{id}/prontuario/evolucoes`.
  3. Consultar a tabela de banco de dados `audit_logs`.
* **Resultado Esperado:** 
  * Resposta HTTP 403 Forbidden com mensagem padronizada de acesso negado.
  * Nenhum dado clínico retornado no payload.
  * Inserção de registro na tabela `audit_logs` contendo: `action: "UNAUTHORIZED_ACCESS_ATTEMPT"`, `user_id`, `role: "RECEPCIONISTA"`, `resource: "PRONTUARIO"`, IP e timestamp.

### CT-07: Concorrência e Trava Anti-Sobreposição no Banco (Issue QA-03)
* **Objetivo:** Impedir que duas consultas sejam agendadas concorrentemente no mesmo intervalo para o mesmo médico.
* **Passos:**
  1. Preparar duas requisições simultâneas via script/teste de carga apontando para `/api/agendamentos` com o mesmo médico, na mesma data e horário (ex: 15/10 às 14:00).
  2. Submeter ambas as requisições em paralelo.
* **Resultado Esperado:**
  * Apenas uma requisição obtém HTTP 201 Created.
  * A segunda requisição é abortada pelo PostgreSQL via constraint de exclusão (`exclusion constraint`) com HTTP 409 Conflict.
  * O banco de dados preserva consistência estrita sem sobreposição de registros.

### CT-17, CT-18 & CT-19: Fluxo de Confirmação WhatsApp via WAHA (Issue QA-05)
* **Objetivo:** Validar o processamento de respostas do paciente via WhatsApp.
* **Passos:**
  1. Simular o envio de webhook do WAHA com mensagem de resposta de um paciente:
     * Caso A: `"Sim, confirmo minha presença!"`
     * Caso B: `"Não vou conseguir ir, favor cancelar"`
     * Caso C: `"Talvez eu chegue 10 minutos atrasado"`
* **Resultado Esperado:**
  * **Caso A:** O agendamento correspondente muda automaticamente na grade para `Confirmado`.
  * **Caso B:** O agendamento é alterado automaticamente para `Cancelado` e o horário fica disponível.
  * **Caso C:** O sistema identifica ambiguidade, mantém o status original e adiciona o atendimento à fila *"Aguardando confirmação manual"* na agenda.

### CT-22 & CT-24: Validação em Camadas e Imutabilidade de PDF (Issue QA-06)
* **Objetivo:** Impedir geração de documentos com placeholders crus e garantir imutabilidade do registro emitido.
* **Passos:**
  1. Tentar emitir um receituário para um paciente cujo cadastro não possui CPF preenchido.
  2. Preencher o CPF, emitir o documento e obter o PDF gerado.
  3. Alterar o template base no editor BlockNote e atualizar o telefone do paciente.
  4. Baixar novamente o PDF emitido anteriormente.
* **Resultado Esperado:**
  * No passo 1, a emissão é bloqueada com mensagem amigável indicando: `"Campo obrigatório faltante: CPF do Paciente"` com atalho *"Corrigir dados"*. Nenhum placeholder (ex: `{{paciente.cpf}}`) é exportado no PDF.
  * No passo 4, o documento emitido permanece **rigorosamente idêntico** ao snapshot original (mesmo conteúdo, hash e formatação).

### CT-29 & CT-31: Proibição Diagnóstica e Descarte Físico do Áudio (Issue QA-07)
* **Objetivo:** Comprovar a destruição do áudio e a estrita função redatora da IA.
* **Passos:**
  1. Realizar upload de arquivo `.mp3` de teste contendo conversa com relato de sintomas e conversas triviais.
  2. Aguardar a finalização do job de transcrição via Sintesy e extração via `gorouter`.
  3. Verificar os campos da anamnese gerados.
  4. Inspecionar o sistema de arquivos / bucket de storage no path onde o áudio temporário foi gravado.
* **Resultado Esperado:**
  * A IA preenche estritamente os tópicos estruturados configurados (Queixa, Histórico, Conduta), descartando conversas triviais e sem incluir opiniões ou conclusões diagnósticas autônomas.
  * O arquivo físico `.mp3` **é deletado com sucesso do disco/storage** (verificação `fs.existsSync` ou `S3.headObject` retorna falso/404).

---

## 4. Matriz de Rastreabilidade Bidirecional (RF ↔ Tarefas QA ↔ Casos de Teste)

| Requisito | Descrição Resumida | Task QA GitHub | Casos de Teste Vinculados | Tipo de Cobertura | Cobertura |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **RF-E1** | Autenticação JWT e Sessão Persistente | QA-01, QA-02 | CT-01, CT-02 | Autenticação, Tokens | 100% |
| **RF-E2** | RBAC: Médico × Recepcionista | QA-02 | CT-03, CT-04, CT-05 | Permissões, BOLA, Logs | 100% |
| **RF-E3** | Criptografia em Repouso e Trânsito | QA-08 | CT-33 | TLS, Criptografia | 100% |
| **RF-E4** | Invalidação de Tokens e Senhas | QA-02, QA-08 | CT-02, CT-33 | Ciclo de Vida de Senhas | 100% |
| **RF-E5** | Trilha de Auditoria para Dados Clínicos | QA-02, QA-08 | CT-04, CT-34 | Conformidade LGPD | 100% |
| **RF-E6** | Minimização de Dados e Blindagem | QA-08 | CT-14, CT-35 | OWASP Top 10, AppSec | 100% |
| **RF-A1** | Grade Dinâmica Diária e Semanal | QA-03 | CT-06 | Interface e Grade | 100% |
| **RF-A2** | Cadastro de Agendamentos e Encaixes | QA-03 | CT-08 | Regras Operacionais | 100% |
| **RF-A3** | Bloqueios de Horários da Agenda | QA-03 | CT-09 | Regras de Agenda | 100% |
| **RF-A4** | Trava Anti-Sobreposição Concorrente | QA-03 | CT-07 | Concorrência no Banco | 100% |
| **RF-A5** | Controle dos 6 Status do Atendimento | QA-03 | CT-06 | Máquina de Estados | 100% |
| **RF-A6** | Atalho 1 Clique Grade ➔ Ficha 360° | QA-03 | CT-10 | Usabilidade e Navegação | 100% |
| **RF-A7** | Encaixe Operacional sem Conflito | QA-03 | CT-08 | Integridade de Horários | 100% |
| **RF-A8** | Lembretes e Confirmação via WhatsApp | QA-05 | CT-16, CT-17, CT-18, CT-19, CT-20 | Webhook WAHA, Resiliência | 100% |
| **RF-B1** | Cadastro Unificado do Paciente | QA-04 | CT-11, CT-15 | Integridade Cadastral | 100% |
| **RF-B2** | Visão 360° do Paciente | QA-03, QA-04 | CT-10, CT-15 | Consolidação de Dados | 100% |
| **RF-B3** | Timeline Cronológica de Atendimentos | QA-03 | CT-10 | Linha do Tempo / PEP | 100% |
| **RF-B4** | Upload de Anexos Clínicos (PDF/JPG) | QA-08 | CT-35 | Upload e Validação MIME | 100% |
| **RF-B5** | Busca Normalizada (Unaccent, Debounce)| QA-04 | CT-11, CT-12, CT-13, CT-14, CT-15 | Normalização de Busca | 100% |
| **RF-C1** | Editor WYSIWYG BlockNote A4 | QA-06 | CT-21 | Interface e Editor | 100% |
| **RF-C2** | Catálogo de Chips e Campos Automáticos | QA-06 | CT-21 | Placeholders Dinâmicos | 100% |
| **RF-C6** | Renderização de PDF via Chromium | QA-06 | CT-23 | Fidelidade Gráfica | 100% |
| **RF-C7** | Snapshot Imutável de Documentos | QA-06 | CT-24 | Imutabilidade e Integridade| 100% |
| **RF-C8** | Validação em 3 Camadas de Templates | QA-06 | CT-22 | Tratamento de Erros | 100% |
| **RF-C9** | Preview com Paciente Fictício | QA-06 | CT-21, CT-23 | Pré-visualização | 100% |
| **RF-C10**| Assinatura Simples com CRM e Metadados | QA-06 | CT-25 | Autenticidade Médica | 100% |
| **RF-D1** | Tópicos de Anamnese Customizados | QA-07 | CT-28 | Schema JSONB | 100% |
| **RF-D2** | Captura MP3 e Truncamento de 500 MB | QA-07 | CT-26, CT-27 | Web Audio / Limites | 100% |
| **RF-D4** | Extração Semântica por Tópicos | QA-07 | CT-28 | IA / gorouter | 100% |
| **RF-D6** | Proibição de Diagnóstico por IA | QA-07 | CT-29 | Segurança Ética | 100% |
| **RF-D8** | Pipeline e Polling do TranscriptionJob | QA-07 | CT-30 | Resiliência SintesyClient | 100% |
| **RF-D9** | Revisão Lado a Lado e Aprovação 1 Clique| QA-07 | CT-32 | Usabilidade Clínica | 100% |
| **RF-D10**| Medição de Consumo e Custo por Clínica | QA-07 | CT-36 | Observabilidade Financeira| 100% |
| **RF-D12**| **Descarte Obrigatório do Áudio** | QA-07, QA-08 | CT-31 | Privacidade e LGPD | 100% |

---

## 5. Governança das Tasks Documentais e de Homologação

### 5.1 [QA-09] (#60): Termo e Aviso de Consentimento de Uso de IA
* **Natureza:** Documento Regulatório e Jurídico de LGPD.
* **Escopo:**
  * Elaboração do termo de consentimento livre e esclarecido a ser apresentado ao paciente.
  * Destaque explícito de que a IA atua única e exclusivamente como secretária/redatora estruturada, cabendo toda e qualquer conduta ou decisão diagnóstica ao médico responsável.
  * Informação transparente sobre a destruição física do áudio gravado após o processamento da transcrição.

### 5.2 [QA-10] (#61): Homologação com Clínica Parceira e Matriz de Defeitos
* **Natureza:** Validação de Aceite em Ambiente Real (Fase AV2).
* **Escopo:**
  * Sessão de homologação com profissionais da clínica parceira em ambiente de staging (`INF-08`).
  * Condução de testes baseados nos CTs com massa de dados de teste descaracterizada.
  * Fechamento da Matriz de Severidade de Bugs (Bloqueante, Alta, Média, Baixa) com tolerância zero para bugs críticos.
  * Roteiro ensaiado de demonstração ao vivo para a banca avaliadora com fallback para mocks locais.

---
**Assinatura Técnica:**  
*Edimar Gabriel Marques Mina — QA & Security Analyst*  
*MedicalFlow Software Factory — 2026/2*
