# PLANO DE TESTES E MATRIZ DE RASTREABILIDADE DE REQUISITOS (RF)

**Projeto:** MedicalFlow — Sistema Integrado de Gestão de Agenda e Prontuário Clínico  
**Organização:** MedicalFlow-team  
**Repositório:** `MedicalFlow-team/medicalflow-monorepo`  
**Responsável QA & Segurança:** Edimar Gabriel Marques Mina (`@GabrielMarques1`)  
**Versão:** 2.1 (Mapeamento 1:1 com Épicos e Issues do Repositório)  
**Data:** 26 de Setembro de 2026  
**Status:** Baseline Oficial Aprovada  

---

## 1. Escopo e Governança do Plano de Testes

### 1.1 Objetivo e Alinhamento com as Tarefas de QA
Este documento estabelece a governança de qualidade, os casos de teste formais e a matriz de rastreabilidade bidirecional do projeto MedicalFlow. O plano extingue numerações genéricas e adota a taxonomia oficial de Requisitos Funcionais por Épico (`RF-A`, `RF-B`, `RF-C`, `RF-D`, `RF-E`) definida em `docs/TASK_BREAKDOWN.md`, cobrindo 100% das tarefas atribuídas à área de **QA & Security** (`QA-01` a `QA-10` / Épico 7):

* **[QA-01] (#52):** Plano de testes cobrindo todos os RFs Must/Should e matriz de rastreabilidade no repo.
* **[QA-02] (#53):** E2E de RBAC (Médico × Recepcionista) e registro de tentativas bloqueadas em log.
* **[QA-03] (#54):** E2E de Agenda (trava anti-sobreposição transacional no banco, 6 status visuais, encaixe e 1 clique).
* **[QA-04] (#55):** E2E de Busca Normalizada (unaccent, CPF com/sem máscara, telefone com DDI, debounce e mascaramento LGPD).
* **[QA-05] (#56):** E2E WhatsApp / WAHA (confirmação automática via palavras-chave, fila manual de ambíguas e reconexão).
* **[QA-06] (#57):** E2E de Emissão/PDF (bloqueio amigável por dados faltantes, regressão visual BlockNote × PDF Chromium e snapshot imutável).
* **[QA-07] (#58):** E2E de Transcrição Inteligente (Sintesy `stt-low` + gorouter, **descarte obrigatório do áudio pós-sucesso**, truncamento de 500 MB e **proibição diagnóstica da IA**).
* **[QA-08] (#59):** Testes de Segurança e LGPD (criptografia TLS 1.3/bcrypt, minimização de dados e auditoria inalterável).
* **[QA-09] (#60):** Termo de consentimento e esclarecimento sobre uso de IA na transcrição clínica.
* **[QA-10] (#61):** Homologação com clínica parceira, fechamento da matriz de bugs e roteiro da demo com mocks para a AV2.

---

## 2. Especificação Formal dos Requisitos Funcionais por Épico

### 2.1 ÉPICO 2: Autenticação, RBAC e Segurança da Informação

#### [RF-E1] [MUST] Autenticação JWT e Sessão Persistente
* **Descrição:** Autenticação única por e-mail e senha, com emissão de token JWT seguro e persistência da sessão na interface web.
* **Critérios de Aceite (BDD):**
  * *Dado* credenciais válidas fornecidas na tela de login, *Quando* a rota `/api/auth/login` for acionada, *Então* retorna HTTP 200 com token assinado e perfil (`role`) do usuário.
  * *Dado* token JWT presente no armazenamento local, *Quando* o usuário recarrega a página, *Então* a sessão permanece ativa sem exigir novo login.

#### [RF-E2] [MUST] RBAC: Segregação Estrita Médico × Recepcionista
* **Descrição:** Controle de acesso granular onde médicos possuem acesso integral e recepcionistas têm acesso restrito a agenda, cadastro civil e download de prescrições/exames, sendo terminantemente bloqueadas para anamnese e evolução clínica.
* **Critérios de Aceite (BDD):**
  * *Dado* recepcionista autenticada, *Quando* tentar acessar registros clínicos em `/api/pacientes/{id}/prontuario`, *Então* recebe HTTP 403 Forbidden e nenhum dado clínico vaza no payload.
  * *Dado* recepcionista autenticada, *Quando* solicitar o download de uma receita ou laudo já emitido pelo médico, *Então* a operação é autorizada com HTTP 200.

#### [RF-E3 / RF-E6] [MUST] Criptografia e Minimização de Dados (LGPD)
* **Descrição:** Criptografia mandatória em trânsito (HTTPS/TLS 1.3) e em repouso (senhas com hash bcrypt). Proibição de exposição de stack traces e dados sensíveis desnecessários em logs.

#### [RF-E4] [MUST] Invalidação de Sessão pós-Troca de Senha ou Desativação
* **Descrição:** Se uma senha for alterada ou a conta desativada, todos os tokens JWT ativos emitidos anteriormente devem ser sumariamente invalidados.

#### [RF-E5] [MUST] Trilha Inalterável de Auditoria de Acessos Clínicos
* **Descrição:** Qualquer leitura, emissão ou tentativa desautorizada em registros de prontuário deve gravar registro imediato na tabela `audit_logs` contendo autor, perfil, recurso, IP e timestamp.

---

### 2.2 ÉPICO 3: Gestão de Agenda e Integração WhatsApp

#### [RF-A1 / RF-A5] [MUST] Grade Dinâmica Diária/Semanal com 6 Status
* **Descrição:** Exibição da agenda em grade diária e semanal com intervalos visíveis e suporte estrito aos 6 status operacionais: `Agendado`, `Confirmado`, `Em Espera`, `Em Atendimento`, `Concluído` e `Cancelado`.

#### [RF-A2 / RF-A3] [MUST/SHOULD] Agendamentos, Bloqueios e Encaixes
* **Descrição:** Permitir marcação de consultas regulares, criação de bloqueios de intervalos médicos e inclusão de encaixes com sinalização visual sem corromper a grade.

#### [RF-A4] [MUST] Trava Anti-Sobreposição Transacional no Banco
* **Descrição:** Bloqueio direto a nível de banco de dados (PostgreSQL `exclusion constraint`) contra agendamentos simultâneos ou conflitantes para o mesmo médico sob concorrência real.
* **Critérios de Aceite (BDD):**
  * *Dado* duas requisições concorrentes disparadas para o mesmo slot médico, *Quando* processadas simultaneamente, *Então* uma é confirmada (HTTP 201) e a outra é abortada pelo banco com HTTP 409 Conflict.

#### [RF-A6] [MUST] Transição Contextual "1 Clique" Grade ➔ Ficha 360°
* **Descrição:** Atalho direto no card da consulta na grade que transfere o médico instantaneamente para a Ficha 360° do paciente selecionado, preservando o contexto do atendimento.

#### [RF-A8] [SHOULD] Integração WhatsApp via WAHA (Lembrete e Confirmação Automática)
* **Descrição:** Automação de comunicação com o paciente via container WAHA self-hosted, realizando o envio de lembrete preventivo 24h antes e triagem automática das respostas.
* **Critérios de Aceite (BDD):**
  * **Cenário 1 (Confirmação Automática):** *Dado* um lembrete enviado via WAHA, *Quando* o paciente responde com palavras-chave afirmativas (`SIM`, `1`, `CONFIRMO`, `OK`), *Então* o webhook processa a resposta e o status da consulta na grade migra automaticamente para `Confirmado`.
  * **Cenário 2 (Cancelamento Automático):** *Dado* o lembrete enviado, *Quando* o paciente responde com termos negativos (`NÃO`, `2`, `CANCELAR`), *Então* o status transiciona automaticamente para `Cancelado` e o horário é liberado.
  * **Cenário 3 (Fila Manual para Ambiguidade):** *Dado* uma resposta ambígua (ex: *"Vou me atrasar um pouco"*, *"Ainda não sei"*), *Quando* o webhook processa a mensagem, *Então* o status não é alterado indevidamente e a consulta é incluída na fila *"Aguardando confirmação manual"* da agenda.
  * **Cenário 4 (Resiliência de Sessão):** *Dado* que a sessão do WAHA é desconectada, *Quando* mensagens de lembrete forem enfileiradas, *Então* o sistema exibe alerta visual na tela e armazena os envios em fila de pendentes para reenvio manual após reconexão.

---

### 2.3 ÉPICO 4: Ficha do Paciente 360° e Busca Normalizada

#### [RF-B1 / RF-B2] [MUST] Cadastro Unificado e Ficha 360°
* **Descrição:** Registro centralizado de dados civis, convênio/particular e visão 360° com histórico de consultas anteriores, diagnósticos e alergias.

#### [RF-B3] [MUST] Timeline Cronológica Contínua de Evolução
* **Descrição:** Linha do tempo sequencial dos atendimentos médicos com anotações de evolução clínica e conduta terapêutica.

#### [RF-B4] [SHOULD] Repositório e Gestão de Anexos Clínicos (PDF/JPG)
* **Descrição:** Armazenamento seguro de exames laboratoriais e laudos em PDF e JPG, com validação de *magic bytes* e limite de tamanho.

#### [RF-B5] [MUST] Busca Incremental Normalizada de Pacientes
* **Descrição:** Mecanismo de busca rápida com debounce de 250 a 300 ms, busca normalizada insensível a acentos (`unaccent`) e pontuação de documentos, com privacidade de dados (mascaramento).
* **Critérios de Aceite (BDD):**
  * *Dado* digitação rápida de nome ou CPF, *Quando* o usuário digita caracteres, *Então* as requisições ao backend aguardam debounce de 250–300 ms antes do disparo.
  * *Dado* buscas por `"Joao"`, `"João"` ou `"JOÃO"`, *Quando* executadas, *Então* todas retornam com sucesso o paciente cadastrado.
  * *Dado* pesquisa com CPF puro (`12345678900`) ou pontuado (`123.456.789-00`), *Quando* consultada, *Então* ambas localizam o registro, exibindo o documento mascarado (`***.456.789-**`) no dropdown de resultados.

---

### 2.4 ÉPICO 5: Templates e Emissão de Documentos Clínicos

#### [RF-C1 / RF-C2] [SHOULD] Editor BlockNote A4 (WYSIWYG) e Chips Dinâmicos
* **Descrição:** Editor de texto rico no padrão folha A4 com catálogo de campos dinâmicos clicáveis via chips (`{{paciente.nome}}`, `{{medico.crm}}`, etc.).

#### [RF-C6 / RNF-11] [SHOULD] Renderizador PDF via Chromium Headless
* **Descrição:** Compilação de BlockNote JSON para HTML/CSS e conversão em PDF via Chromium headless com exata fidelidade visual WYSIWYG.

#### [RF-C7 / RF-C10] [MUST] Snapshot Imutável e Assinatura Simples
* **Descrição:** Documentos emitidos tornam-se snapshots congelados e imutáveis. Edições posteriores no template ou dados civis não alteram retroativamente os documentos emitidos. Assinatura médica contendo CRM, data/hora e hash de integridade.

#### [RF-C8] [SHOULD] Validação em 3 Camadas e Bloqueio Amigável
* **Descrição:** Prevenção contra emissão de documentos corrompidos ou com tags cruas. Se faltar dado obrigatório (ex: CPF do paciente), a emissão é travada amigavelmente com botão *"Corrigir dados"*.

---

### 2.5 ÉPICO 6: Transcrição Inteligente de Voz e Medição de Consumo

#### [RF-D1] [SHOULD] Configuração de Tópicos de Anamnese por Médico (JSONB)
* **Descrição:** O médico personaliza previamente em quais seções estruturadas deseja que a transcrição seja dividida (ex: Queixa Principal, História da Moléstia, Conduta).

#### [RF-D2] [SHOULD] Captura de Áudio e Truncamento de 500 MB
* **Descrição:** Gravação de áudio no navegador em formato MP3. Arquivos que excederem o teto de 500 MB são cortados automaticamente no backend, marcados com a flag `truncated` e sinalizados ao usuário.

#### [RF-D4] [SHOULD] Extração Semântica Direcionada via gorouter
* **Descrição:** Sumarização via prompt com schema JSON estrito, mapeando o áudio aos tópicos configurados e descartando conversas triviais (*small talk*).

#### [RF-D6] [MUST - CRÍTICO DE SEGURANÇA E CONFORMIDADE] Proibição de Parecer Diagnóstico Autônomo pela IA
* **Descrição:** Restrição mandatória de segurança clínica e conformidade médica: **a inteligência artificial atua estritamente como redatora e secretária estruturada**, sendo terminantemente proibida de inferir diagnósticos, receitar medicamentos ou sugerir condutas terapêuticas que não tenham sido verbalizadas explicitamente pelo profissional médico durante a consulta.
* **Critérios de Aceite (BDD):**
  * **Cenário 1 (Fidelidade ao relato verbal):** *Dado* um áudio onde o médico relata sintomas de dor torácica sem emitir conclusão clínica, *Quando* a extração do `gorouter` for executada, *Então* a IA resume unicamente os sintomas citados e preenche a hipótese diagnóstica como `null` ou não mencionada, sem tentar inferir infarto ou patologia autônoma.
  * **Cenário 2 (Tentativa de indução):** *Dado* um áudio capcioso com perguntas diretas sobre diagnóstico, *Quando* processado, *Então* o modelo restringe sua resposta ao schema estruturado de transcrição, recusando qualquer formulação de parecer clínico próprio.

#### [RF-D8] [SHOULD] Pipeline TranscriptionJob com Estados e Resiliência
* **Descrição:** Pipeline assíncrono com polling e estados visíveis (`processando`, `concluido`, `falhou`). Em caso de timeout da API Sintesy B2B, o atendimento é preservado e um botão de reenvio manual é habilitado.

#### [RF-D9] [SHOULD] Revisão Lado a Lado e Aprovação em 1 Clique
* **Descrição:** Interface de conferência lado a lado (áudio transcrito vs. tópicos extraídos), permitindo edição rápida e gravação no prontuário somente após confirmação do médico.

#### [RF-D10] [SHOULD SECUNDÁRIO] Painel de Medição de Consumo e Custos por Clínica
* **Descrição:** Registro de auditoria financeira por atendimento transcrito (minutos de áudio e custo estimado Sintesy/gorouter), disponibilizando painel gerencial de consumo sem bloqueio operacional do fluxo de atendimento.
* **Critérios de Aceite (BDD):**
  * *Dado* uma transcrição concluída com sucesso, *Quando* o job finaliza, *Então* grava na tabela de métricas a duração do áudio (segundos) e o cálculo proporcional de custo da clínica.
  * *Dado* o acesso ao painel gerencial da clínica, *Quando* o administrador consulta o mês corrente, *Então* o sistema totaliza os minutos consumidos e a estimativa de custos sem impactar a execução das consultas.

#### [RF-D12] [MUST - CRÍTICO DE PRIVACIDADE E LGPD] Descarte Físico Obrigatório do Arquivo de Áudio
* **Descrição:** Mandato estrito de proteção de dados sensíveis de saúde: **o arquivo de áudio original capturado deve ser destruído física e permanentemente do disco/storage** imediatamente após a conclusão bem-sucedida do processamento da transcrição e extração dos tópicos.
* **Critérios de Aceite (BDD):**
  * *Dado* um arquivo `temp_audio_123.mp3` processado com sucesso pelo `TranscriptionJob`, *Quando* o status migra para `concluido`, *Então* a rotina invoca a exclusão do arquivo no sistema de arquivos/S3 e a verificação de existência do arquivo retorna 404/falso.

---

## 3. Matriz Completa de Casos de Teste (CT-01 a CT-36)

| ID do Caso | Issue QA | Requisito Formal | Título do Caso de Teste | Categoria | Severidade |
| :--- | :---: | :---: | :--- | :--- | :---: |
| **CT-01** | QA-02 | RF-E1 | Autenticação bem-sucedida com JWT e persistência de sessão | Funcional / Auth | Alta |
| **CT-02** | QA-02 | RF-E1/E4 | Invalidação de credenciais pós-troca de senha | Segurança / Auth | Alta |
| **CT-03** | QA-02 | RF-E2 | Bloqueio RBAC: Recepcionista acessando prontuário (HTTP 403) | Segurança / RBAC | Crítica |
| **CT-04** | QA-02 | RF-E2/E5 | Registro em log de auditoria ao bloquear recepcionista | Auditoria / LGPD | Crítica |
| **CT-05** | QA-02 | RF-E2 | Permissão RBAC: Recepcionista baixando prescrições/exames emitidos | Funcional / RBAC | Alta |
| **CT-06** | QA-03 | RF-A1/A5 | Renderização da grade diária/semanal com os 6 status visuais | Interface / UI | Média |
| **CT-07** | QA-03 | RF-A4 | Rejeição de sobreposição concorrente de horários no PostgreSQL | Concorrência / Banco | Crítica |
| **CT-08** | QA-03 | RF-A2/A7 | Inclusão de encaixe operacional sinalizado sem quebrar horários | Regra de Negócio | Alta |
| **CT-09** | QA-03 | RF-A3 | Bloqueio de agendamento sobre intervalos médicos reservados | Regra de Negócio | Média |
| **CT-10** | QA-03 | RF-A6 | Navegação contextual em 1 clique da grade para a Ficha 360° | Usabilidade / E2E | Alta |
| **CT-11** | QA-04 | RF-B5 | Busca de pacientes com debounce de 250–300 ms na digitação | Performance / UI | Média |
| **CT-12** | QA-04 | RF-B5 | Busca insensível a acentuação gráfica (unaccent) e maiúsculas | Funcional / Busca | Alta |
| **CT-13** | QA-04 | RF-B5 | Busca por CPF com e sem máscara pontuada retornando mesmo registro| Funcional / Busca | Alta |
| **CT-14** | QA-04 | RF-B5 | Mascaramento de CPF na listagem de resultados da busca (LGPD) | Privacidade / UI | Alta |
| **CT-15** | QA-04 | RF-B5 | Desambiguação de homônimos por data de nascimento e telefone | Usabilidade / Dados | Média |
| **CT-16** | QA-05 | RF-A8 | Disparo automático de lembrete de consulta 24h antes via WAHA | Integração / Job | Alta |
| **CT-17** | QA-05 | RF-A8 | Confirmação de consulta via WhatsApp com palavras-chave afirmativas | Integração / Regra | Alta |
| **CT-18** | QA-05 | RF-A8 | Cancelamento de consulta via WhatsApp com palavras-chave negativas | Integração / Regra | Alta |
| **CT-19** | QA-05 | RF-A8 | Triagem de resposta ambígua para fila "Aguardando confirmação manual"| Regra / Exceção | Alta |
| **CT-20** | QA-05 | RF-A8 | Tratamento de queda de sessão do WAHA com alerta e fila de pendentes| Resiliência / Infra | Alta |
| **CT-21** | QA-06 | RF-C1/C2 | Editor BlockNote A4 com inserção e renderização de chips dinâmicos | Interface / Editor | Média |
| **CT-22** | QA-06 | RF-C8 | Bloqueio amigável na emissão com botão "Corrigir dados" (CPF faltante)| Validação em Camadas| Alta |
| **CT-23** | QA-06 | RF-C6/RNF-11| Regressão visual e fidelidade entre preview BlockNote e PDF Chromium| Interface / PDF | Alta |
| **CT-24** | QA-06 | RF-C7 | Snapshot imutável (alteração no template não afeta PDF emitido) | Integridade / PEP | Crítica |
| **CT-25** | QA-06 | RF-C10 | Assinatura simples no PDF contendo CRM, nome, data/hora e hash | Conformidade Médica | Alta |
| **CT-26** | QA-07 | RF-D2 | Captura de áudio no navegador em formato MP3 com filtro de ruído | Mídia / Frontend | Média |
| **CT-27** | QA-07 | RF-D2 | Truncamento automático de áudio > 500 MB com log e aviso ao usuário | Limite / Borda | Alta |
| **CT-28** | QA-07 | RF-D4 | Extração semântica descartando small talk e preenchendo tópicos JSONB| IA / Sumarização | Alta |
| **CT-29** | QA-07 | RF-D6 | **CT DEDICADO: Bloqueio estrito de parecer diagnóstico por IA** | **Segurança e Ética**| **Crítica** |
| **CT-30** | QA-07 | RF-D8 | Resiliência do SintesyClient com reenvio manual sem perda de consulta | Resiliência / API | Alta |
| **CT-31** | QA-07 | RF-D12 | **CT DEDICADO: Descarte físico definitivo do áudio pós-sucesso** | **Privacidade / LGPD**| **Crítica** |
| **CT-32** | QA-07 | RF-D9 | Revisão lado a lado na interface e gravação mediante 1 clique | Usabilidade / E2E | Alta |
| **CT-33** | QA-08 | RF-E3 | Criptografia TLS 1.3 em trânsito e hashing bcrypt para senhas | Segurança / Infra | Crítica |
| **CT-34** | QA-08 | RF-E5 | Rastreabilidade e completude dos logs de auditoria clínica | Auditoria / LGPD | Crítica |
| **CT-35** | QA-08 | RF-E6/RNF-5 | Testes de injeção SQL/NoSQL e blindagem contra vazamento de erros | AppSec / OWASP | Crítica |
| **CT-36** | QA-07 | RF-D10 | **CT DEDICADO: Medição de consumo e custo por clínica sem bloqueio** | **Should Secundário** | **Média** |

---

## 4. Matriz de Rastreabilidade Bidirecional (RF ↔ Task QA ↔ Casos de Teste)

```
┌───────────┬──────────────┬─────────────┬────────────────────────────────┬──────────────┐
│ Requisito │ Classificação│ Task QA     │ Casos de Teste Vinculados      │ Cobertura    │
├───────────┼──────────────┼─────────────┼────────────────────────────────┼──────────────┤
│ RF-E1     │ MUST         │ QA-01, QA-02│ CT-01, CT-02                   │ 100% (2 CTs) │
│ RF-E2     │ MUST         │ QA-02       │ CT-03, CT-04, CT-05            │ 100% (3 CTs) │
│ RF-E3/E6  │ MUST         │ QA-08       │ CT-14, CT-33, CT-35            │ 100% (3 CTs) │
│ RF-E4     │ MUST         │ QA-02, QA-08│ CT-02, CT-33                   │ 100% (2 CTs) │
│ RF-E5     │ MUST         │ QA-02, QA-08│ CT-04, CT-34                   │ 100% (2 CTs) │
│ RF-A1/A5  │ MUST         │ QA-03       │ CT-06                          │ 100% (1 CT)  │
│ RF-A2/A7  │ SHOULD       │ QA-03       │ CT-08                          │ 100% (1 CT)  │
│ RF-A3     │ SHOULD       │ QA-03       │ CT-09                          │ 100% (1 CT)  │
│ RF-A4     │ MUST         │ QA-03       │ CT-07                          │ 100% (1 CT)  │
│ RF-A6     │ MUST         │ QA-03       │ CT-10                          │ 100% (1 CT)  │
│ RF-A8     │ SHOULD       │ QA-05       │ CT-16, CT-17, CT-18, CT-19, 20 │ 100% (5 CTs) │
│ RF-B1/B2  │ MUST         │ QA-03, QA-04│ CT-10, CT-15                   │ 100% (2 CTs) │
│ RF-B3     │ MUST         │ QA-03       │ CT-10                          │ 100% (1 CT)  │
│ RF-B4     │ SHOULD       │ QA-08       │ CT-35                          │ 100% (1 CT)  │
│ RF-B5     │ MUST         │ QA-04       │ CT-11, CT-12, CT-13, CT-14, 15 │ 100% (5 CTs) │
│ RF-C1/C2  │ SHOULD       │ QA-06       │ CT-21                          │ 100% (1 CT)  │
│ RF-C6/R11 │ SHOULD       │ QA-06       │ CT-23                          │ 100% (1 CT)  │
│ RF-C7     │ MUST         │ QA-06       │ CT-24                          │ 100% (1 CT)  │
│ RF-C8/C9  │ SHOULD       │ QA-06       │ CT-21, CT-22, CT-23            │ 100% (3 CTs) │
│ RF-C10    │ SHOULD       │ QA-06       │ CT-25                          │ 100% (1 CT)  │
│ RF-D1/D4  │ SHOULD       │ QA-07       │ CT-28                          │ 100% (1 CT)  │
│ RF-D2     │ SHOULD       │ QA-07       │ CT-26, CT-27                   │ 100% (2 CTs) │
│ RF-D6     │ MUST (Ética) │ QA-07       │ CT-29 (Dedicado)               │ 100% (1 CT)  │
│ RF-D8     │ SHOULD       │ QA-07       │ CT-30                          │ 100% (1 CT)  │
│ RF-D9     │ SHOULD       │ QA-07       │ CT-32                          │ 100% (1 CT)  │
│ RF-D10    │ SHOULD Sec.  │ QA-07       │ CT-36 (Dedicado)               │ 100% (1 CT)  │
│ RF-D12    │ MUST (Priv.) │ QA-07, QA-08│ CT-31 (Dedicado)               │ 100% (1 CT)  │
└───────────┴──────────────┴─────────────┴────────────────────────────────┴──────────────┘
Total: 27 Requisitos Atômicos Mapeados | 36 Casos de Teste Detalhados | Cobertura MoSCoW: 100%
```

---

## 5. Governança das Tarefas de Homologação e Regulatórias

### 5.1 [QA-09] (#60): Termo de Consentimento e Uso Ético de IA
* **Classificação:** Documentação Regulatória / Jurídica (LGPD).
* **Diretrizes Incorporadas:**
  * Consentimento prévio do paciente para captação do áudio no consultório médico.
  * Declaração inequívoca de que o modelo atua unicamente como assistente redator estruturado, sem autonomia diagnóstica.
  * Notificação sobre a destruição imediata e definitiva do registro sonoro após o processamento.

### 5.2 [QA-10] (#61): Homologação em Clínica Parceira e Matriz de Defeitos
* **Classificação:** Aceite Final e Homologação de Usuário Real (AV2).
* **Diretrizes Incorporadas:**
  * Ambiente de homologação provisionado com dados simulados (`INF-08`).
  * Matriz de bugs classificada em Bloqueante, Alta, Média e Baixa, com critério de liberação: **Zero bugs Bloqueantes ou Altos**.
  * Roteiro da demonstração ao vivo para a banca acadêmica operando com mocks locais dos serviços externos (Sintesy e WAHA).

---
**Assinatura Técnica:**  
*Edimar Gabriel Marques Mina — QA & Security Analyst*  
*MedicalFlow Software Factory — 2026/2*
