# MedFlow — Contrato de API (fonte única da equipe)

> **Fonte única de verdade para back e front.** O back implementa exatamente isto (BE-03 materializa como OpenAPI/Eden); o front consome via Eden Treaty e **nunca** inventa campo. Qualquer mudança de contrato = PR neste documento + aprovação da equipe.
> Base: `https://<env>/api` · JSON · `Authorization: Bearer <token>` · campos **camelCase** · datas ISO 8601 UTC (`2026-10-22T14:00:00Z`) · IDs = UUID v4.

## 0. Convenções gerais

| Item | Regra |
|---|---|
| Autenticação | Header `Authorization: Bearer <jwt>` em tudo, exceto `POST /auth/login`, `GET /health` e `POST /webhooks/waha` |
| Papéis | `medico` (total) · `recepcionista` (agenda, pacientes, WhatsApp, **leitura** de Prescrições/Exames) |
| Paginação | `?limit=20&offset=0` (limit máx 100) → envelope `{ "data": [...], "total": N, "limit": L, "offset": O }` |
| Uploads | `multipart/form-data`; limite de arquivo por endpoint documentado na seção |
| Vazio opcional | Campo opcional ausente → **omitido** no JSON ou `null`; o front deve tratar os dois |
| Timezone | Agenda trabalha com offset local do consultório enviado como ISO 8601 **com offset** (ex.: `-03:00`); o banco guarda UTC |
| Valores monetários | String decimal com 2 casas (`"12.50"`), nunca float |

## 1. Erros (envelope único)

Toda resposta de erro:
```json
{
  "error": {
    "code": "SLOT_CONFLICT",
    "message": "Já existe um atendimento neste horário para este profissional.",
    "details": [{ "field": "startsAt", "issue": "occupied" }]
  }
}
```

| HTTP | code | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body/parâmetro inválido |
| 401 | `UNAUTHENTICATED` | Token ausente/expirado/inválido (troca de senha desativou) |
| 403 | `FORBIDDEN` | Papel sem permissão (sempre gera log de auditoria) |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `SLOT_CONFLICT` | Sobreposição de agendamento (rejeitada **pelo banco**) |
| 409 | `CPF_ALREADY_EXISTS` | Cadastro com CPF duplicado |
| 409 | `TEMPLATE_COM_ERRO` | Emissão de template com status `com_erro` |
| 413 | `AUDIO_TOO_LARGE_BEYOND_TRUNCATION` | Áudio que nem cabe após truncar (ex.: > 500 MB não MP3) — caso teórico; MP3 sempre trunca |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Áudio não é MP3 / anexo não é PDF-JPG |
| 422 | `MISSING_REQUIRED_FIELDS` | Emissão sem campo obrigatório → `details: [{field, label}]` |
| 422 | `VALIDATION_ERROR` | Semântica de negócio inválida (transição de status, datas) |
| 502 | `UPSTREAM_FAILURE` | Sintesy/WAHA indisponível após retries (job vira `falhou`) |
| 500 | `INTERNAL` | Erro não mapeado (nunca vaza stack) |

## 2. Enums (valores exatos, strings)

```text
AppointmentStatus : agendado | confirmado | em_espera | em_atendimento | concluido | cancelado
AppointmentType   : primeira_consulta | retorno | procedimento | teleconsulta
UserRole          : medico | recepcionista
TemplateType      : receita | receita_controlado | laudo | personalizado
TemplateStatus    : ok | com_erro
DocumentType      : prescricao | exame | laudo | personalizado   (prescricao = receita + receita_controlado)
WhatsappState     : conectado | desconectado | aguardando_qr
MessageState      : pendente | enviando | enviada | falhou
JobStatus         : processando | concluido | falhou
ManualAction     : confirmar | cancelar | ignorar
```

## 3. DTOs base

```jsonc
// Clinic
{ "id": "uuid", "name": "Clínica São Lucas", "cnpj": "12.345.678/0001-90",
  "address": { "street": "Rua A", "number": "123", "complement": null, "district": "Centro", "city": "Fortaleza", "uf": "CE", "zipCode": "60000-000" },
  "phone": "(85) 99999-1234", "logoUrl": "https://…/logo.png" }

// User
{ "id": "uuid", "name": "Dra. Ana", "email": "ana@clinica.com", "role": "medico",
  "crm": "12345-CE", "specialty": "Cardiologia", "active": true, "clinicId": "uuid" }

// Patient (resumo usado em listas)
{ "id": "uuid", "name": "Maria Oliveira Santos", "cpfMasked": "123.***.***-00",
  "birthDate": "1980-05-10", "phone": "(85) 98888-7777" }

// PatientDetail (ficha 360°)
{ "id": "uuid", "name": "…", "cpf": "12345678900", "socialName": null, "sex": "feminino",
  "birthDate": "1980-05-10", "email": "maria@mail.com", "phone": "…",
  "insurancePlan": { "name": "Unimed", "cardNumber": "003456789" },
  "address": { …como Clinic… }, "weightKg": "70.5", "heightCm": "165",
  "allergies": "Dipirona", "medications": "Losartana 50mg", "createdAt": "…", "updatedAt": "…" }

// Appointment
{ "id": "uuid", "patient": { …Patient resumo… }, "professional": { "id": "uuid", "name": "Dra. Ana" },
  "startsAt": "2026-10-05T09:00:00-03:00", "endsAt": "2026-10-05T09:30:00-03:00",
  "type": "retorno", "status": "confirmado", "notes": null, "noShow": false,
  "manualConfirmation": null, "createdAt": "…" }
```

## 4. Auth

### POST /auth/login
Público.
```json
// request
{ "email": "ana@clinica.com", "password": "…" }
// 200
{ "token": "<jwt sem expiração>", "user": { …User… } }
// 401 UNAUTHENTICATED — "E-mail ou senha inválidos."
```

### POST /auth/change-password
Autenticado. Troca a senha, **invalida o token atual** e devolve um novo.
```json
// request
{ "currentPassword": "…", "newPassword": "…" }
// 200 { "token": "<novo jwt>" }
// 401 se currentPassword errado
```

### GET /auth/me
`200 { …User… }` — usado no boot do front para restaurar sessão.

### PATCH /users/{id}  (desativação)
Desativar usuário (`"active": false`) **invalida o token dele** imediatamente (RF-E1).

## 5. Usuários e clínica (só `medico`)

| Endpoint | Request | Retorno |
|---|---|---|
| `GET /users` | — | `200 {data:[User], total}` |
| `POST /users` | `{name,email,password,role,crm?,specialty?}` | `201 User` |
| `PATCH /users/{id}` | parcial de User (`active`, `name`, `crm`, `specialty`) | `200 User` |
| `GET /clinic` | — | `200 Clinic` |
| `PATCH /clinic` | parcial de Clinic | `200 Clinic` |
| `POST /clinic/logo` | multipart `file` (png/jpg ≤ 2 MB) | `200 { "logoUrl": "…" }` |

`POST /users` com e-mail existente → `409 VALIDATION_ERROR` `"E-mail já cadastrado."`

## 6. Pacientes e anexos

### POST /patients  (medico + recepcionista)
```json
// request — obrigatórios: name, cpf, birthDate, phone, address, city, uf
{ "name": "Maria Oliveira Santos", "cpf": "12345678900", "socialName": null,
  "sex": "feminino", "birthDate": "1980-05-10", "email": null, "phone": "85988887777",
  "insurancePlan": { "name": "Unimed", "cardNumber": "003456789" },
  "address": { "street": "Rua A", "number": "123", "complement": null, "district": "Centro", "city": "Fortaleza", "uf": "CE", "zipCode": "60000-000" },
  "weightKg": null, "heightCm": null, "allergies": null, "medications": null }
// 201 → { …PatientDetail… }
// 409 CPF_ALREADY_EXISTS · 400 VALIDATION_ERROR (CPF inválido, UF inválida…)
```
Regras: CPF aceito com ou sem pontuação (normalizado para 11 dígitos); telefone aceito com pontuação/DDI (normalizado para E.164 `5585988887777`); campos opcionais podem vir `null`.

### GET /patients?q=…&limit=20&offset=0  (busca incremental — FE-05/BE-11)
`q` compara contra `nome_normalizado` (unaccent, caixa baixa, sem espaços extras), `cpf_normalizado` (só dígitos) e `telefone_normalizado` (só dígitos, sem `+55`). `q` é normalizado igualmente antes da busca.
```json
// 200
{ "data": [ { …Patient resumo (cpfMasked)… } ], "total": 1, "limit": 20, "offset": 0 }
```
`q` vazio → retorna os 20 mais recentes. Sempre limitado a 100.

### GET /patients/{id}
`200 { …PatientDetail… }` — ficha 360° é montada pelo front com este + `GET /appointments?patientId=` + `GET /documents?patientId=` + `GET /patients/{id}/attachments`.

### PATCH /patients/{id}
Parcial de PatientDetail → `200`. Re-normaliza colunas de busca.

### POST /patients/{id}/attachments  (multipart)
`file` PDF/JPG ≤ 20 MB + `kind` ( `exame` | `documento` ) + `description?` → `201 { "id": "uuid", "kind": "exame", "description": null, "fileName": "lab.pdf", "sizeBytes": 123, "createdAt": "…" }`
`415 UNSUPPORTED_MEDIA_TYPE` se não PDF/JPG.

### GET /patients/{id}/attachments
`200 {data:[Attachment], total}`

### GET /attachments/{id}/download
`200` stream do arquivo (Content-Type correto). `404` caso removido.

## 7. Agenda (medico + recepcionista)

### GET /appointments?from=&to=&professionalId=&patientId=&status=&limit=&offset=
Intervalo `from`/`to` ISO 8601 (até 62 dias). **Com `patientId`, o intervalo é opcional** (retorna histórico do paciente, mais recentes primeiro) — usado pela timeline FE-07. Sem `professionalId` → todos os profissionais.
```json
// 200
{ "data": [ { …Appointment… } ], "total": 12, "limit": 100, "offset": 0 }
```

### GET /appointments/{id}
Detalhe do atendimento **incluindo a anamnese** (se aprovada) — usado pela ficha/timeline (FE-06/FE-07).
```json
// 200
{ …Appointment…,
  "anamnese": { "id": "uuid", "topics": { "queixa_principal": "…", "conduta": "…" },
    "approvedAt": "2026-10-05T09:35:00-03:00" } }
// anamnese: null enquanto não aprovada
```

### POST /appointments
Encaixe = mesmo endpoint (horário fora da grade de 30 min apenas não avisa sobre conveniência).
```json
// request — obrigatórios: patientId, professionalId, startsAt, endsAt
{ "patientId": "uuid", "professionalId": "uuid",
  "startsAt": "2026-10-05T09:00:00-03:00", "endsAt": "2026-10-05T09:30:00-03:00",
  "type": "primeira_consulta", "notes": null }
// 201 → { …Appointment… }  (status inicial: "agendado")
// 409 SLOT_CONFLICT — "Já existe atendimento neste horário." (rejeitado pelo banco, não pela app)
// 422 VALIDATION_ERROR — endsAt ≤ startsAt
```
Ao criar, se a clínica tiver WhatsApp conectado, o sistema agenda a mensagem de confirmação (não dispara aqui; o job BE-10 cuida).

### PATCH /appointments/{id}
Mover horário/profissional/tipo/observações → `200 Appointment`. Mesmo `409 SLOT_CONFLICT` da criação.
```json
{ "startsAt": "2026-10-05T10:00:00-03:00", "endsAt": "2026-10-05T10:30:00-03:00" }
```

### PATCH /appointments/{id}/status
```json
// request
{ "status": "cancelado", "noShow": true }   // noShow só aceito junto de cancelado
// 200 → { …Appointment… }
// 422 VALIDATION_ERROR — transição inválida (ex.: concluido → agendado)
```
Transições válidas:
```text
agendado → confirmado | em_espera | em_atendimento | cancelado
confirmado → em_espera | em_atendimento | cancelado
em_espera → em_atendimento | cancelado
em_atendimento → concluido | cancelado
concluido, cancelado → (terminal)
```
Cancelamento de consulta que tinha WhatsApp disparado registra no log de mensagens (não reenvia).

### POST /blocks
Bloqueio de agenda do profissional (feriado, almoço, plantão).
```json
// request — obrigatórios: professionalId, startsAt, endsAt
{ "professionalId": "uuid", "startsAt": "2026-10-05T12:00:00-03:00",
  "endsAt": "2026-10-05T14:00:00-03:00", "reason": "Almoço" }
// 201 → { "id": "uuid", "professionalId": "uuid", "startsAt": "…", "endsAt": "…", "reason": "Almoço" }
// 409 SLOT_CONFLICT — conflita com atendimento existente
```

### GET /blocks?from=&to=&professionalId=
`200 {data:[Block], total}`

### DELETE /blocks/{id}
`204` · `404`

### GET /manual-confirmations
Fila "aguardando confirmação manual" (RF-A8) — mensagens ambíguas não resolvidas.
```json
// 200
{ "data": [ { "id": "uuid", "appointment": { …Appointment resumo… }, "patientPhone": "5585988887777",
  "receivedText": "talvez consiga", "receivedAt": "2026-10-04T18:22:00-03:00", "state": "pendente" } ], "total": 1 }
```

### POST /manual-confirmations/{id}/resolve
```json
// request
{ "action": "confirmar" }   // confirmar | cancelar | ignorar
// 200 → { "appointment": { …Appointment… } }  // ignorar não mexe no status, só tira da fila
```

## 8. WhatsApp (medico + recepcionista)

### GET /whatsapp/session
```json
// 200
{ "state": "conectado", "connectedPhone": "5585999991234", "qr": null, "lastEventAt": "2026-10-01T08:00:00-03:00" }
// state=aguardando_qr → "qr" traz dataURL do QR para render ( FE-10 )
// state=desconectado  → conectadoPhone/qr null; painel mostra "Reconectar"
```

### POST /whatsapp/session/reconnect
Força nova sessão no WAHA (invalida a anterior). → `200 { "state": "aguardando_qr", "qr": "data:image/png;base64,…" }`

### GET / PUT /whatsapp/settings
Textos das mensagens, editáveis pela clínica. Placeholders simples entre chaves:
```json
// PUT request (os dois obrigatórios)
{ "confirmationTemplate": "Olá {{paciente_nome}}! Sua consulta com {{profissional_nome}} está marcada para {{data}} às {{hora}}. Responda SIM para confirmar ou NÃO para cancelar.",
  "reminderTemplate": "Olá {{paciente_nome}}! Lembramos da sua consulta amanhã ({{data}} às {{hora}}) com {{profissional_nome}}. Responda SIM para confirmar ou NÃO para cancelar." }
// 200 → devolve o objeto salvo
```
Placeholders válidos: `paciente_nome, profissional_nome, data, hora`. Placeholder inválido → `422 VALIDATION_ERROR` listando.

### POST /whatsapp/send
Disparo manual (confirmação agora ou reenvio do lembrete).
```json
// request
{ "appointmentId": "uuid", "kind": "confirmacao" }   // confirmacao | lembrete
// 202 → { "messageId": "uuid", "state": "pendente" }
// 409 VALIDATION_ERROR — sessão desconectada ("Conecte o WhatsApp antes de enviar.")
```

### GET /whatsapp/messages?appointmentId=
```json
// 200
{ "data": [ { "id": "uuid", "appointmentId": "uuid", "kind": "confirmacao",
  "body": "Olá Maria!…", "state": "enviada", "error": null,
  "receivedText": "sim", "receivedAt": "2026-10-04T17:02:00-03:00", "sentAt": "2026-10-04T16:00:00-03:00" } ], "total": 1 }
```

### POST /whatsapp/messages/{id}/resend
Reenvia mensagem com `state=falhou` → `202 { "messageId": "uuid", "state": "pendente" }`. Sucesso ou falha chega depois por polling de `GET /whatsapp/messages`.

### POST /webhooks/waha  (interno — sem JWT)
Autenticado por header `X-WAHA-Secret` (401 se errado). Eventos aceitos: `message` (resposta do paciente) e `session.status` (conexão/QR). Não é chamado pelo front; documentado aqui porque o contrato do BE-09 e do INF-03 depende dele.

## 9. Templates e catálogo (só `medico`)

### GET /templates?type=&includeArchived=false
`200 {data:[{id,name,type,status,createdAt,updatedAt}], total}` — lista sem o conteúdo (leve).

### POST /templates
```json
// request
{ "name": "Receita simples", "type": "receita",
  "content": { …BlockNote JSON… } }   // blocos de texto com chips {{entidade.campo}}
// 201 → { "id": "uuid", "name": "…", "type": "receita", "status": "ok", "missingFields": [] }
// 201 com template inválido → { "status": "com_erro", "missingFields": [
//    {"field":"paciente.endereco","label":"Endereço do paciente"} ] }
```
Template com placeholder inexistente salva com `status=com_erro` e **fica inutilizável para emissão** (bloqueio de amigável de 3ª camada — BE-15).

### GET /templates/{id}
`200 → { …Template…, "content": { …BlockNote… }, "missingFields": [ … ] }`

### PATCH /templates/{id}
Parcial de `{name?, type?, content?}` → revalida (mesmos efeitos do POST).

### DELETE /templates/{id}  (arquivar soft)
Template arquivado sai da lista padrão (`includeArchived=false`) e não pode mais emitir — documentos já emitidos continuam íntegros (snapshot). → `204` · `404`

### GET /fields-catalog
Catálogo que alimenta o botão "Inserir campo automático" (FE-12) e a validação (BE-15/16).
```json
// 200
{ "groups": [
  { "group": "paciente", "fields": [
    { "key": "paciente.nome", "label": "Nome completo", "requiredByDefault": true },
    { "key": "paciente.endereco", "label": "Endereço do paciente", "requiredByDefault": false,
      "requiredFor": ["receita_controlado"] } ] },
  { "group": "medico", "fields": [ … ] },
  { "group": "atendimento", "fields": [ … ] },
  { "group": "clinica", "fields": [ … ] } ] }
```
Campos do catálogo = Seção 3.3 da especificação (essenciais `requiredByDefault:true`; complementares `false`). `requiredFor` = obrigatoriedade por tipo de documento (ex.: endereço só é obrigatório em `receita_controlado`).

### POST /templates/{id}/preview
Renderiza o PDF com **paciente fictício** (preview do editor, RF-C9). → `200 application/pdf` (bytes).

## 10. Documentos — emissão e central

### POST /documents/emit  (só `medico`)
```json
// request
{ "templateId": "uuid", "patientId": "uuid", "appointmentId": "uuid?",
  "freeText": "Dipirona 500mg — 1 cp de 8/8h por 3 dias." }
// 201 → { "id": "uuid", "templateName": "Receita simples", "type": "prescricao",
//        "patient": { …resumo… }, "emittedAt": "…", "pdfUrl": "/api/documents/{id}/pdf" }
// 409 TEMPLATE_COM_ERRO — "Este template está com erro. Corrija antes de emitir."
// 422 MISSING_REQUIRED_FIELDS → { "error": { "code": "MISSING_REQUIRED_FIELDS",
//    "message": "Dados obrigatórios ausentes.", "details": [
//      {"field":"paciente.endereco","label":"Endereço do paciente"} ] } }
```
Snapshot: o JSON emitido congela **todos os valores resolvidos** no momento (editar o template depois NUNCA altera documentos já emitidos). `freeText` é o texto livre digitado na tela de emissão. Log de auditoria `document.emit` é gravado aqui.

### GET /documents?patientId=&appointmentId=&type=&limit=&offset=
```json
// 200
{ "data": [ { "id": "uuid", "templateName": "Receita simples", "type": "prescricao",
  "patient": { …resumo… }, "emittedAt": "2026-10-05T09:40:00-03:00", "pdfUrl": "/api/documents/{id}/pdf" } ], "total": 3 }
```

### GET /documents/{id}
`200 → { …summary…, "snapshot": { …valores resolvidos… } }` — o snapshot é imutável.

### GET /documents/{id}/pdf
`200 application/pdf` (stream do arquivo arquivado). `recepcionista` só acessa `type` ∈ `prescricao | exame` (laudo e personalizado → `403`, com log de auditoria).

## 11. Transcrição da anamnese (só `medico`)

### GET / PUT /settings/anamnese-topics
Tópicos da anamnese configuráveis por médico (RF-D1). O `key` alimenta a extração (BE-20) e é o mesmo em todo o sistema.
```json
// PUT request
{ "topics": [ { "key": "queixa_principal", "label": "Queixa principal", "required": true },
  { "key": "sintomas", "label": "Sintomas", "required": true },
  { "key": "medicamentos", "label": "Medicamentos em uso", "required": false },
  { "key": "conduta", "label": "Conduta", "required": true } ] }
// 200 → devolve o objeto salvo; key duplicada → 422
```

### POST /transcriptions  (multipart)
```http
POST /api/transcriptions   — multipart/form-data
  audio         : arquivo MP3 (obrigatório)
  appointmentId : uuid (obrigatório)
```
```json
// 202
{ "id": "uuid", "status": "processando", "appointmentId": "uuid",
  "originalSizeBytes": 524288001, "processedSizeBytes": 524288000,
  "truncated": true }
// 400 VALIDATION_ERROR — appointmentId ausente
// 415 UNSUPPORTED_MEDIA_TYPE — não é MP3
// 409 VALIDATION_ERROR — já existe job em processamento para o atendimento
```
Acima de 500 MB: o back-end **trunca para 500 MB** no primeiro frame MP3 válido (ffmpeg), grava `truncated:true` + `originalSizeBytes` vs `processedSizeBytes`, e o campo aparece na tela (FE-17).

### GET /transcriptions/{id}  (polling do FE-17)
```json
// 200
{ "id": "uuid", "status": "concluido", "truncated": true,
  "durationSeconds": 312,
  "transcriptionText": "Paciente relata dor de cabeça há três dias…",
  "extraction": { "queixa_principal": "Dor de cabeça há três dias",
    "sintomas": "Sem febre", "medicamentos": null, "conduta": "Solicitar exame" },
  "error": null, "approvedAt": null, "createdAt": "…" }
// status=falhou → { "status": "falhou", "error": "UPSTREAM_FAILURE: Sintesy indisponível após 3 tentativas." }
```
`extraction` usa exatamente os `key` de `anamnese-topics`; informação ausente = `null` (nunca inventada).

### GET /transcriptions?appointmentId=
`200 {data:[ …job sem transcriptionText… ], total}` — histórico de tentativas do atendimento.

### POST /transcriptions/{id}/retry
Só `status=falhou` → `202 { "id": "uuid", "status": "processando" }` · `409` se já concluído. O áudio **reenviado** reusa o arquivo truncado/limpo já validado (não exige novo upload — RF-D8 reenvio manual).

### PATCH /transcriptions/{id}  (revisão médica, FE-18)
Só `status=concluido`. Edita `transcriptionText` e/ou campos de `extraction`:
```json
// request
{ "extraction": { "queixa_principal": "Cefaleia há 3 dias, sem febre" } }
// 200 → job atualizado
```

### POST /transcriptions/{id}/approve
Só `status=concluido` e depois de `PATCH` se houver edição. **Descarta o áudio** (RF-D12) e grava a anamnese no atendimento:
```json
// 201
{ "anamneseId": "uuid", "appointmentId": "uuid", "approvedAt": "2026-10-05T09:35:00-03:00" }
// 409 VALIDATION_ERROR — tópicos obrigatórios (required=true) ainda null
```
Aprovar pela segunda vez → `409` (anamnese é única por atendimento; edição posterior vai pelo prontuário, fora do MVP).

## 12. Uso, auditoria e health

### GET /usage?month=YYYY-MM  (só `medico`)
Painel de consumo (FE-19). **Sem bloqueio de cota** — só medição (Seção 5.5 da espec.).
```json
// 200
{ "month": "2026-10", "jobsCount": 43, "totalSeconds": 8123,
  "estimatedCostBRL": 27.41,
  "byModel": [ { "model": "stt-low", "seconds": 8123, "cost": 27.41 } ] }
```
Cada job grava: clínica, médico, atendimento, duração, modelo, status, `sintesyRequestId`, custo estimado (custo/minuto do `stt-low` em variável de ambiente; preço de venda = decisão futura).

### GET /audit-logs?from=&to=&userId=&resource=&limit=&offset=  (só `medico`)
```json
// 200
{ "data": [ { "id": "uuid", "userId": "uuid", "userName": "Dra. Ana",
  "action": "document.emit", "resource": "Document", "resourceId": "uuid",
  "ip": "…", "at": "2026-10-05T09:40:00-03:00" } ], "total": 57 }
```
Ações gravadas: `auth.login`, `auth.login_failed`, `auth.password_change`, `user.deactivate`, `patient.read_detail` (ficha 360°), `document.emit`, `document.download`, `transcription.approve`, `whatsapp.session_reconnect`. `FORBIDDEN` em rota restrita também gera `forbidden.access`.

### GET /health  (sem auth — INF-07)
`200 { "status": "ok", "version": "1.0.0", "db": "ok", "waha": "ok" }` — `waha` reflete o último estado conhecido da sessão.

## 13. Matriz RBAC (resumo)

| Endpoint-group | `medico` | `recepcionista` |
|---|---|---|
| /auth/* | ✔ | ✔ |
| /users, /clinic | ✔ | ✖ (403 + log) |
| /patients (CRUD, busca, anexos) | ✔ | ✔ |
| /appointments, /blocks, /manual-confirmations | ✔ | ✔ |
| /whatsapp/* | ✔ | ✔ |
| /templates/* (edição) | ✔ | ✖ |
| /documents/emit | ✔ | ✖ |
| /documents (listar/baixar) | ✔ | parcial — só `type` prescricao/exame |
| /transcriptions/*, /settings/anamnese-topics | ✔ | ✖ |
| /usage, /audit-logs | ✔ | ✖ |

## 14. Entidades e tipos (modelo Prisma — BE-02 implementa isto)

> Decisões anti-overengineering já tomadas: **1 clínica por deploy** (Clinic é singleton, FK só no User); convênio é **coluna em Patient** (não entidade); catálogo de campos e `requiredFor` vivem **em código** (BE-16), não em tabela; tópicos de anamnese são **JSONB no User**; arquivos ficam em **volume local** (path), servidos por stream — nada de S3 no MVP; dinheiro em **centavos (Int)**, nunca Float.

```prisma
// Tipos primitivos: ids = String @id @default(uuid()) · datas = DateTime (tstz) · JSON = Json
// Dinheiro = Int (centavos). Enums do §2 = Prisma enum (AppointmentStatus, UserRole, TemplateType, …)

model Clinic {
  id         String   @id @default(uuid())
  name       String                          // "Clínica São Lucas"
  cnpj       String   @unique
  phone      String?
  logoPath   String?                         // volume local, servido por endpoint
  // endereço (flat — valor, não entidade)
  street     String   @default("")
  number     String   @default("")
  complement String?
  district   String   @default("")
  city       String   @default("")
  uf         String   @default("")
  zipCode    String?
  // JSONB de configuração simples
  whatsappSettings Json?                     // {confirmationTemplate, reminderTemplate} (§8)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String                          // bcrypt, cost 10
  role         UserRole                          // medico | recepcionista
  crm          String?                           // obrigatório se role=medico (validação app)
  specialty    String?
  active       Boolean   @default(true)
  tokenVersion Int       @default(0)            // bump = invalida JWT (troca de senha/desativação)
  anamneseTopics Json?                        // [{key,label,required}] (RF-D1) — default de seed
  clinicId     String
  clinic       Clinic    @relation(fields:[clinicId], references:[id])
  @@index([clinicId])
}

model Patient {
  id               String   @id @default(uuid())
  name             String
  nameNormalized   String                          // unaccent+lower+trim — busca (BE-11)
  cpf              String                          // 11 dígitos, sem pontuação
  cpfNormalized    String   @unique                // = cpf; campo separado p/ clareza do índice
  cpfMasked        String                          // "123.***.***-00" — denormalizado p/ listas
  socialName       String?
  sex              String?                         // feminino | masculino | outro
  birthDate        DateTime?                       // @db.Date
  email            String?
  phone            String                          // E.164: 5585988887777
  phoneNormalized  String                          // só dígitos sem 55 inicial — busca
  insuranceName    String?
  insuranceCard    String?
  weightKg         Float?
  heightCm         Float?
  allergies        String?                         // texto livre MVP
  medicationsUse   String?                         // texto livre MVP
  street           String   @default("")
  number           String   @default("")
  complement       String?
  district         String   @default("")
  city             String   @default("")
  uf               String   @default("")
  zipCode          String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([nameNormalized])    // + índice trigram (gin/gist) via SQL na migração
  @@index([phoneNormalized])
}

model Appointment {
  id              String   @id @default(uuid())
  patientId       String
  patient         Patient  @relation(fields:[patientId], references:[id])
  professionalId  String
  professional    User     @relation("ApptProf", fields:[professionalId], references:[id])
  startsAt        DateTime
  endsAt          DateTime
  type            AppointmentType @default(primeira_consulta)
  status          AppointmentStatus @default(agendado)
  notes           String?
  noShow          Boolean  @default(false)          // só com status=cancelado
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  anamnese        Anamnese?
  @@index([professionalId, startsAt])               // grade da agenda
  @@index([patientId, startsAt])                   // timeline
  // trava anti-sobreposição (BE-08) — SQL na migração:
  // EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  //   WHERE (status <> 'cancelado')
}

model Block {
  id             String @id @default(uuid())
  professionalId String
  professional   User   @relation(fields:[professionalId], references:[id])
  startsAt       DateTime
  endsAt         DateTime
  reason         String
  @@index([professionalId, startsAt])
}

model Anamnese {
  id                String  @id @default(uuid())
  appointmentId     String  @unique               // 1:1 — aprovar 2ª vez = 409
  appointment       Appointment @relation(fields:[appointmentId], references:[id])
  transcriptionJobId String?
  topics            Json                             // {key: valor|null} (§11)
  approvedById      String
  approvedAt        DateTime @default(now())
}

model TemplateDocument {
  id            String  @id @default(uuid())
  name          String
  type          TemplateType                     // receita | receita_controlado | laudo | personalizado
  content       Json                             // BlockNote JSON com chips {{entidade.campo}}
  status        TemplateStatus @default(ok)      // ok | com_erro (placeholder inválido)
  missingFields Json?                            // [{field,label}] do com_erro
  archivedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([archivedAt])
}

model DocumentEmitted {
  id           String   @id @default(uuid())
  templateId   String
  template     TemplateDocument @relation(fields:[templateId], references:[id])
  type         DocumentType                      // prescricao | exame | laudo | personalizado
  patientId    String
  patient      Patient  @relation(fields:[patientId], references:[id])
  appointmentId String?
  freeText     String?
  snapshot     Json                              // TODOS os valores resolvidos — imutável
  pdfPath      String                            // volume local
  emittedById  String
  emittedAt    DateTime @default(now())
  @@index([patientId, emittedAt])
  @@index([appointmentId])
}

model Attachment {
  id          String   @id @default(uuid())
  patientId   String
  patient     Patient  @relation(fields:[patientId], references:[id])
  kind        String                          // exame | documento
  fileName    String
  filePath    String                          // volume local
  mimeType    String                          // application/pdf | image/jpeg | image/png
  sizeBytes   Int
  description String?
  createdAt   DateTime @default(now())
  @@index([patientId, createdAt])
}

model TranscriptionJob {
  id                String    @id @default(uuid())
  appointmentId     String
  appointment       Appointment @relation(fields:[appointmentId], references:[id])
  professionalId    String
  status            JobStatus @default(processando)   // processando | concluido | falhou
  audioPath         String?                             // temporário; null após descarte
  audioMimeType     String
  originalSizeBytes Int
  processedSizeBytes Int
  truncated         Boolean   @default(false)
  durationSeconds   Int?
  transcriptionText String?
  extraction        Json?                               // {key: valor|null} (§11)
  error             String?
  sintesyRequestId   String?                             // id do request p/ medição (BE-21)
  model             String    @default("stt-low")
  costCents         Int?                                // custo estimado no momento (BE-21)
  approvedAt        DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  @@index([appointmentId])
  @@index([createdAt])                                  // /usage por mês
  // SQL na migração (BE-18): unique partial index
  //   ON transcription_jobs(appointment_id) WHERE status='processando'
}

model SintesyCredential {          // singleton (1 clínica por deploy) — BE-04/BE-17
  id            String  @id @default(uuid())
  mode          String  @default("b2b")        // b2b | service_account (fallback)
  apiKey        String?                          // B2B key — só back-end lê
  email         String?                          // fallback service account
  passwordHash  String?
  tokenCache    String?                          // token do modo fallback
  tokenExpiresAt DateTime?
  updatedAt     DateTime @updatedAt
}

model WhatsappSession {           // singleton (1 sessão por clínica) — BE-09/INF-03
  id             String  @id @default(uuid())
  state          String  @default("desconectado")   // conectado | desconectado | aguardando_qr
  sessionName    String  @default("medflow")        // sessão WAHA fixa
  connectedPhone String?
  qrCache        String?                             // dataURL do QR atual
  lastEventAt    DateTime?
  updatedAt      DateTime @updatedAt
}

model WhatsappMessage {
  id            String   @id @default(uuid())
  appointmentId String
  appointment   Appointment @relation(fields:[appointmentId], references:[id])
  kind          String                             // confirmacao | lembrete
  body          String                             // texto interpolado enviado
  state         MessageState @default(pendente)    // pendente | enviando | enviada | falhou
  error         String?
  sentAt        DateTime?
  receivedText  String?                            // resposta do paciente
  receivedAt    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([appointmentId, createdAt])
  @@index([state])                                   // painel de falhas (FE-10)
}

model ManualConfirmation {
  id            String  @id @default(uuid())
  appointmentId String  @unique                     // 1 fila por agendamento
  appointment   Appointment @relation(fields:[appointmentId], references:[id])
  message       WhatsappMessage @relation(fields:[messageId], references:[id])
  messageId     String
  receivedText  String
  state         String  @default("pendente")        // pendente | resolvido
  resolvedAction String?                             // confirmar | cancelar | ignorar
  resolvedById  String?
  resolvedAt    DateTime?
  receivedAt    DateTime @default(now())
  @@index([state])
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?
  userName   String                              // denormalizado (user pode ser desativado)
  action     String                              // §12: document.emit, patient.read_detail…
  resource   String
  resourceId String?
  ip         String?
  at         DateTime @default(now())
  @@index([at])                                    @@index([userId, at])
}
```

Notas de migração (SQL manual nas 3 exóticas): `CREATE EXTENSION IF NOT EXISTS unaccent, pg_trgm;` + índice trigram `ON patient USING gin (name_normalized gin_trgm_ops)`; o `EXCLUDE` e o partial unique index do Appointment/TranscriptionJob conforme comentários acima. Normalizações (`nameNormalized`, `phoneNormalized`, `cpfMasked`) são calculadas **na aplicação** (biblioteca shared, sem trigger — mais testável).

## 15. Checklist API ↔ tasks (revisão de cobertura)

Cada endpoint mapeado para quem consome — **nenhuma tela sem API, nenhuma API sem tela**:

| Front/task | Endpoints que usa |
|---|---|
| FE-02 login/sessão | POST /auth/login · GET /auth/me · POST /auth/change-password |
| FE-03 grade | GET /appointments · GET /users?role=medico |
| FE-04 formulários | POST /appointments · PATCH /appointments/{id} · PATCH …/status · POST/DELETE /blocks |
| FE-05 busca | GET /patients?q= |
| FE-06 ficha 360° | GET /patients/{id} · GET /appointments?patientId= · GET /documents?patientId= · GET /patients/{id}/attachments · GET /attachments/{id}/download |
| FE-07 timeline | GET /appointments?patientId= · GET /appointments/{id} (anamnese) |
| FE-08 anexos | POST/GET /patients/{id}/attachments · GET /attachments/{id}/download |
| FE-09 fila manual | GET /manual-confirmations · POST /manual-confirmations/{id}/resolve |
| FE-10 WhatsApp | GET /whatsapp/session · POST …/reconnect · GET/PUT /whatsapp/settings · GET /whatsapp/messages · POST /whatsapp/send · POST /whatsapp/messages/{id}/resend |
| FE-11 editor | (BlockNote local — sem API) |
| FE-12 chips | GET /fields-catalog |
| FE-13 preview | POST /templates/{id}/preview |
| FE-14 emissão | GET /templates · POST /documents/emit |
| FE-15 central | GET /documents · GET /documents/{id}/pdf |
| FE-16 captura | (MediaRecorder local) · POST /transcriptions |
| FE-17 polling | GET /transcriptions/{id} · GET /transcriptions?appointmentId= · POST /transcriptions/{id}/retry |
| FE-18 revisão | GET /settings/anamnese-topics · PATCH /transcriptions/{id} · POST /transcriptions/{id}/approve |
| FE-19 consumo | GET /usage |
| FE-20 configurações | GET/PATCH /clinic · POST /clinic/logo · PUT /settings/anamnese-topics · PUT /whatsapp/settings |
| QA-02/08 | GET /audit-logs · GET /health |

**Gaps achados na revisão e já corrigidos neste documento**: `GET /appointments/{id}` com anamnese (ficha/timeline); `from`/`to` opcionais quando `patientId` informado; `DELETE /templates/{id}` (arquivamento soft); `POST /whatsapp/send` (disparo manual). Sem logout no back — JWT descartado no cliente; sem edição de anamnese pós-aprovação (fora do MVP, §11).
