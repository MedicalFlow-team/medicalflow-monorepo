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
