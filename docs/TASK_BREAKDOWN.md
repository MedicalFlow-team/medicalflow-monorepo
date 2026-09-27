# MedFlow — Breakdown de Tasks (por área)

> Derivado de `ESPECIFICACAO_REQUISITOS_EPICOS.md` (pós-decisões 2026-09-23). Donos: **Infra = João** · **Backend = Ruan + Samuel** · **Frontend = Rodrigo** · **QA = Gabriel**.
> Handles GitHub: joaotolovi · JuaDevBR · samuelvictor29 · skrodrigo · GabrielMarques1
> Marcos: SR II (22/10) · SR III (30/11) · AV2 (15/12)

## INFRA — João (joaotolovi)

| ID | Task | Épico | Ref | Marco |
|---|---|---|---|---|
| INF-01 | Bootstrap do workspace Bun no monorepo: pacotes `api` (Elysia) e reuso do `medicalflow-web` (Vite) com type-check e lint | 1 | — | SR II |
| INF-02 | Docker: images dev/prod da API e web + `docker-compose` de desenvolvimento (Postgres incluído) | 1 | — | SR II |
| INF-03 | Container **WAHA** self-hosted com **volume persistente da sessão** + webhook recebendo no back-end | 1, 3 | RF-A8 §3.1 | SR II |
| INF-04 | CI/CD GitHub Actions: lint + type-check + testes + build Docker em cada PR; deploy automatizado em push na main | 1 | RNF-6 | SR II |
| INF-05 | Gestão de secrets/env por ambiente: credencial **API B2B Sintesy**, chave gorouter, segredo do webhook WAHA | 1, 6 | RF-D7 | SR II |
| INF-06 | PostgreSQL de produção: provisionamento, migrations no pipeline, rotina de backup | 1, 7 | RNF-1 | SR II |
| INF-07 | Observabilidade básica: healthchecks, logs centralizados, alerta de sessão WAHA desconectada | 1, 3, 7 | — | SR III |
| INF-08 | Ambientes de homologação para a clínica parceira (deploy de staging + dados de demonstração) | 7 | §9 | SR III |

## BACKEND — Ruan (JuaDevBR) + Samuel (samuelvictor29)

| ID | Task | Épico | Ref | Marco |
|---|---|---|---|---|
| BE-01 | **Spike Prisma + Playwright/Chromium sobre Bun** (fallback: Drizzle; worker Node só p/ PDF) — decisão registrada em ADR | 1 | §3.4? não: Épico 1 [PENDENTE] | SR II |
| BE-02 | Schema Prisma completo: Clínica, Usuário, Paciente, Agenda, Atendimento, Anamnese, TemplateDocumento, DocumentoEmitido, Anexo, Auditoria, SintesyB2BCredential, TranscriptionJob, WhatsappSession, MensagemWhatsapp | 1 | Épico 1 | SR II |
| BE-03 | OpenAPI + Eden Treaty (contratos tipados front↔back) | 1 | RNF-9 | SR II |
| BE-04 | **ADR-002: contrato da API B2B do Sintesy** (chave por clínica, medição, erros, fallback conta de serviço) + **ADR-003: renderizador PDF** | 1 | §5.3 | SR II |
| BE-05 | Auth JWT sem expiração + invalidação em troca de senha/desativação + bcrypt | 2 | RF-E1/E4 | SR II |
| BE-06 | RBAC: médico (total) × recepcionista (agenda, cadastro, leitura Prescrições/Exames); tentativa bloqueada → log | 2 | RF-E2 | SR II |
| BE-07 | Middleware de auditoria de acessos a dados sensíveis | 2 | RF-E5 | SR II |
| BE-08 | CRUD de agendamentos, bloqueios e encaixes + **trava anti-sobreposição transacional** (constraint/exclusion no Postgres) | 3 | RF-A2/A3/A4/A7 | SR II |
| BE-09 | Cliente WAHA: envio de lembrete, webhook de resposta, normalização + **palavras-chave com variações** (SIM/1/CONFIRMO… × NÃO/2/CANCELAR…), atualização de status, fila "aguardando confirmação manual", estados `pendente→enviada→falhou` | 3 | RF-A8 §3.1 | SR III |
| BE-10 | Job de lembrete automático (ex.: 24h antes) com texto editável pela clínica | 3 | §3.1 | SR III |
| BE-11 | CRUD de pacientes + **busca normalizada** (colunas `nome_normalizado`/`cpf_normalizado`/`telefone_normalizado`, índices, unaccent) | 4 | RF-B5 §3.2 | SR II |
| BE-12 | Upload e armazenamento de anexos clínicos (PDF/JPG) por paciente | 4 | RF-B4 | SR III |
| BE-13 | Interpolação de campos `{{entidade.campo}}` + **snapshot imutável** do documento emitido + assinatura simples (nome/CRM, autor/data/hora, log) | 5 | RF-C7/C10 §3.3 | SR III |
| BE-14 | **Renderizador PDF**: BlockNote JSON → HTML (mesmo CSS do editor) → PDF (Chromium headless); fidelidade WYSIWYG | 5 | RF-C6 RNF-11 | SR III |
| BE-15 | Validação em 3 camadas: status "Template com erro" ao salvar; bloqueio amigável na emissão com lista de campos faltantes; nenhum placeholder cru no PDF | 5 | §3.3 | SR III |
| BE-16 | Catálogo de campos com metadados (`requiredByDefault`, `requiredFor` por tipo de documento) | 5 | §3.3 | SR III |
| BE-17 | `SintesyClient` isolado: auth **API B2B** (fallback conta de serviço), chamada `assistant/transcribe/` com modelo **`stt-low`**, retry/backoff, mock para dev | 6 | RF-D3/D7/D8 §5.3 | SR III |
| BE-18 | Pipeline `TranscriptionJob`: estados visíveis, polling, reenvio manual, **descarte do áudio após sucesso** (RF-D12) | 6 | RF-D8/D12 RNF-8 | SR III |
| BE-19 | **Truncamento de áudio**: MP3 ≤ 500 MB; acima, corta para 500 MB no back-end, registra `truncated` e devolve aviso | 6 | RF-D2 §3.4 | SR III |
| BE-20 | `ExtractionProvider` → **gorouter**: prompt com schema JSON estrito, só tópicos configurados, `null` quando ausente, proibição diagnóstica, validação da saída | 6 | RF-D4/D6 §5.4 | SR III |
| BE-21 | **Medição de uso/custo por clínica** (RF-D10): registro por transcrição + endpoints do painel de consumo (sem bloqueio) | 6 | §5.5 | SR III |
| BE-22 | Configuração de tópicos de anamnese por médico (JSONB) + endpoints de integração WhatsApp/mensagens editáveis | 6, 3 | RF-D1, §3.1 | SR III |

## FRONTEND — Rodrigo (skrodrigo)

| ID | Task | Épico | Ref | Marco |
|---|---|---|---|---|
| FE-01 | Base de UI: Tailwind + design system + layout app (sidebar, header) a partir do Figma | 1 | — | SR II |
| FE-02 | Tela de login + sessão persistente (JWT sem expiração) + controle de papel na UI | 2 | RF-E1/E2 | SR II |
| FE-03 | **Grade de agenda** diária/semanal com slots e os 6 status visuais | 3 | RF-A1/A5 | SR II |
| FE-04 | Formulários de criação de consulta, bloqueio e **encaixe** (sem sobrepor atendimento) | 3 | RF-A2/A3/A4 | SR II |
| FE-05 | **Busca incremental de pacientes** (debounce 250–300 ms, máscaras CPF/telefone, resultados com CPF mascarado + data nasc./telefone p/ confirmar) | 4 | RF-B5 §3.2 | SR II |
| FE-06 | **Ficha 360°**: dados pessoais + convênio + histórico; aberta em 1 clique a partir da grade | 4 | RF-B2/A6/B3 | SR II |
| FE-07 | Timeline cronológica de atendimentos + evolução | 4 | RF-B3 | SR III |
| FE-08 | Upload de anexos PDF/JPG na ficha | 4 | RF-B4 | SR III |
| FE-09 | **Fila "aguardando confirmação manual"** na tela da agenda (respostas ambíguas do WhatsApp) | 3 | §3.1 | SR III |
| FE-10 | Painel WhatsApp: conexão por **QR code**, estado da sessão (conectado/desconectado/aguardando QR), mensagens com falha/reenvio, textos editáveis | 3 | §3.1 | SR III |
| FE-11 | **Editor BlockNote A4**: texto rico, alinhamento, logo, cabeçalho/rodapé, divisores; WYSIWYG fiel ao PDF | 5 | RF-C1 | SR III |
| FE-12 | Botão **"Inserir campo automático"**: catálogo por grupo (Paciente/Médico/Atendimento/Clínica/Documento), chips visuais clicáveis, sintaxe invisível | 5 | RF-C2 §3.3 | SR III |
| FE-13 | **Preview com paciente fictício** durante a edição do template | 5 | RF-C9 | SR III |
| FE-14 | Tela de emissão: campo de texto livre, bloqueio amigável com "Corrigir dados" quando faltar campo obrigatório | 5 | RF-C8 §3.3 | SR III |
| FE-15 | **Central de Documentos**: PDFs por paciente e por atendimento, download/envio | 5 | RF-C6 | SR III |
| FE-16 | Captura de áudio: MediaRecorder + filtro Web Audio, saída **MP3**, validação de 500 MB e aviso de truncamento | 6 | RF-D2 §3.4 | SR III |
| FE-17 | Tela de transcrição: estados do job (processando/concluído/falhou-reenviar) com polling | 6 | RF-D8 | SR III |
| FE-18 | **Revisão lado a lado** (transcrição ↔ extração por tópicos), edição inline, aprovação em 1 clique → anamnese do atendimento | 6 | RF-D5/D9 | SR III |
| FE-19 | Painel de **consumo por clínica** (minutos e custo estimado do mês) | 6 | RF-D10 §5.5 | SR III |
| FE-20 | Configurações: identidade visual/logo da clínica, tópicos de anamnese (RF-D1), mensagens WhatsApp | 5, 6, 3 | §3.3 | SR III |

## QA — Gabriel (GabrielMarques1)

| ID | Task | Épico | Ref | Marco |
|---|---|---|---|---|
| QA-01 | **Plano de testes** + matriz de rastreabilidade RF ↔ casos de teste | 7 | — | SR II |
| QA-02 | E2E de RBAC: recepcionista baixa prescrições/exames e **não** acessa anamnese/evolução; tentativa bloqueada registrada em log | 2 | RF-E2, Épico 2 | SR II |
| QA-03 | E2E de agenda: sobreposição concorrente rejeitada **pelo banco**; 6 status; encaixe sem conflito; 1 clique → ficha | 3 | RF-A4/A5/A6/A7 | SR II |
| QA-04 | E2E de busca: acentos/caixa, CPF com/sem pontuação, telefone com DDI, debounce, desambiguação na lista | 4 | RF-B5 §3.2 | SR III |
| QA-05 | E2E WhatsApp (WAHA real + mock): "sim" muda status sem intervenção; ambígua → fila manual; sessão cai → aviso + fila de pendentes | 3 | RF-A8 §3.1 | SR III |
| QA-06 | E2E de emissão/PDF: CPF faltante bloqueia com mensagem amigável; **regressão visual preview × PDF**; template editado não altera documento emitido | 5 | RF-C7/C10 RNF-11 | SR III |
| QA-07 | E2E de transcrição (Sintesy real + mock): small talk gera só tópicos configurados; falha do Sintesy → job reenviável sem perder atendimento; **áudio não existe mais após sucesso**; áudio > 500 MB truncado com aviso e registro | 6 | Épico 6 | SR III |
| QA-08 | Testes de segurança/LGPD: criptografia em repouso/trânsito, bcrypt, descarte do áudio, minimização, auditoria de acessos | 7 | RF-E3/E5/E6 | SR III |
| QA-09 | Draft do **termo/aviso de uso de IA** (transcrição) p/ validação jurídica/LGPD | 7 | §5.6, 10.2-6 | SR III |
| QA-10 | **Homologação com a clínica parceira** + matriz de bugs + roteiro da demonstração ao vivo (AV2) | 7 | §9 | AV2 |

## Notas
- BE-01 (spike) é **gargalo**: decide Prisma vs Drizzle e worker PDF — executar primeiro, antes de BE-02/BE-14.
- BE-04 (ADR-002) trava BE-17: sem contrato B2B, o `SintesyClient` usa o fallback de conta de serviço + mock.
- INF-03 e BE-09 são o par WAHA; INF-04 é pré-requisito de tudo que vai pro deploy.
- Total: **60 tasks** (INF 8 · BE 22 — Ruan 9 / Samuel 13 · FE 20 · QA 10).

## Grafo de dependências (issue # = entre parênteses)

> Formato: `TASK (issue)` → o que ela precisa antes. **Caminho crítico: INF-01 (#2) → BE-01 (#10) → BE-02 (#11) → BE-03 (#12) → resto.** Front pode começar FE-01/02/11 em paralelo (mock/mock-server) sem esperar back.

```text
INFRA
  INF-01 (2)  ← base de tudo (workspaces)
  INF-02 (3)  ← INF-01
  INF-03 (4)  ← INF-02 (WAHA sobe no compose)            ┐ par WAHA
  INF-04 (5)  ← INF-01                                   │
  INF-05 (6)  ← INF-04 (secrets no CI)                   │
  INF-06 (7)  ← INF-02 (Postgres externo ao compose dev)  │
  INF-07 (8)  ← INF-04 · BE-09 (23)  (alerta sessão WAHA) │
  INF-08 (9)  ← INF-04 · BE-01/02 · CI verde             ┘

BACKEND
  BE-01 (10) spike      ← INF-01 · [resultado: mantém Prisma+Playwright ou migra]
  BE-02 (11) schema     ← BE-01
  BE-03 (12) OpenAPI    ← BE-02 · (materializa o CONTRATOS_API.md)
  BE-04 (13) ADRs       ← (—)          [trava de contrato B2B, sem dependência técnica]
  BE-05 (19) auth       ← BE-02 · BE-03
  BE-06 (20) RBAC       ← BE-05
  BE-07 (21) auditoria  ← BE-05
  BE-08 (22) agenda     ← BE-02 · BE-03 · BE-06
  BE-09 (23) WAHA cli   ← INF-03 (4) · BE-08
  BE-10 (24) lembrete   ← BE-09
  BE-11 (25) busca      ← BE-02 · BE-03
  BE-12 (26) anexos     ← BE-02 · BE-03
  BE-13 (14) snapshot   ← BE-02 · BE-16 (16)
  BE-14 (15) PDF        ← BE-01 (decisão do spike) · BE-03
  BE-15 (27) validação  ← BE-13 · BE-16
  BE-16 (16) catálogo   ← BE-02
  BE-17 (17) Sintesy    ← BE-04 (13) · INF-05 (6) · BE-03
  BE-18 (28) pipeline   ← BE-17 · BE-02
  BE-19 (29) truncamento← BE-18
  BE-20 (18) extração   ← BE-17 · BE-22 (31)
  BE-21 (30) medição    ← BE-18
  BE-22 (31) tópicos    ← BE-02 · BE-03

FRONTEND  (todas dependem de FE-01 (32); back indicado é o mínimo p/ integrar de verdade)
  FE-02 (33) login       ← back: BE-05 (19) · BE-06 (20)
  FE-03 (34) grade       ← back: BE-03 (12, endpoints prontos) · BE-08 (22)
  FE-04 (35) formulários ← back: BE-08 (22) · BE-06 (20)
  FE-05 (36) busca       ← back: BE-11 (25)
  FE-06 (37) ficha 360°  ← back: BE-11 (25) · BE-12 (26) · BE-21/13 p/ docs (14/30)
  FE-07 (38) timeline    ← back: BE-08 (22, GET /appointments?patientId)
  FE-08 (39) anexos      ← back: BE-12 (26)
  FE-09 (40) fila manual ← back: BE-09 (23)
  FE-10 (41) WhatsApp    ← back: BE-09 (23) · INF-03 (4)
  FE-11 (42) editor      ← back: (nenhum — BlockNote local)
  FE-12 (43) chips       ← back: BE-16 (16, GET /fields-catalog)
  FE-13 (44) preview     ← back: BE-14 (15, POST /templates/{id}/preview)
  FE-14 (45) emissão     ← back: BE-15 (27) · BE-13 (14)
  FE-15 (46) central doc ← back: BE-13 (14) · BE-14 (15)
  FE-16 (47) captura     ← back: (upload só com BE-18 (28); gravação é local)
  FE-17 (48) polling     ← back: BE-18 (28) · BE-19 (29)
  FE-18 (49) revisão     ← back: BE-20 (18) · BE-22 (31)
  FE-19 (50) consumo     ← back: BE-21 (30)
  FE-20 (51) config      ← back: BE-22 (31) · BE-09 (23) · clinic/logo (31)

QA
  QA-01 (52) plano       ← (—) começa já
  QA-02 (53) RBAC        ← BE-06 (20) · BE-07 (21) · FE-02 (33)
  QA-03 (54) agenda      ← BE-08 (22) · FE-03 (34) · FE-04 (35) · FE-06 (37)
  QA-04 (55) busca       ← BE-11 (25) · FE-05 (36)
  QA-05 (56) WhatsApp    ← BE-09 (23) · BE-10 (24) · FE-10 (41) · INF-03 (4)
  QA-06 (57) PDF         ← BE-14 (15) · BE-15 (27) · FE-13 (44) · FE-14 (45) · FE-15 (46)
  QA-07 (58) transcrição ← BE-17 (17) · BE-18 (28) · BE-19 (29) · BE-20 (18) · FE-17 (48) · FE-18 (49)
  QA-08 (59) segurança   ← BE-07 (21) · BE-18 (28, descarte áudio)
  QA-09 (60) termo IA    ← (—) começa já
  QA-10 (61) homologação ← INF-08 (9) · QA-02..QA-08
```

## Contrato de API
Todos os endpoints, bodies, retornos, enums e o **modelo de entidades completo** estão em [`docs/CONTRATOS_API.md`](CONTRATOS_API.md) — fonte única: o back implementa exatamente o que está lá, o front consome pelo contrato (via Eden Treaty, BE-03). Checklist endpoint↔task na seção 15 do contrato.
