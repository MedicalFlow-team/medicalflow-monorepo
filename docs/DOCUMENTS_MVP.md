# Flowcare — ciclo de vida de documentos clínicos no MVP

**Origem:** [decisão de produto #195](https://github.com/flow-care/flowcare/issues/195). Escopo definido para o MVP: PDF final para impressão e assinatura manuscrita, sem emissão de receitas controladas. A revisão clínica dos campos por tipo e a decisão técnica do renderizador ainda estão pendentes. Nenhum módulo de documentos está implementado na API neste momento.

## Tipos do MVP

Receita simples sem medicamento sujeito a controle especial, atestado, laudo e solicitação de exames. Cada tipo possui campos e template próprios. Documento livre/personalizado também fica para uma fase posterior: sem campos estruturados seria difícil impedir o uso como receita controlada. O PDF gerado é identificado como **destinado à impressão e assinatura manual**, sem indicação de assinatura eletrônica ou de validade digital autônoma. Receitas controladas e documentos eletrônicos assinados ficam para uma fase posterior, com validação regulatória específica.

## Estados

| Estado | Conteúdo | Ações permitidas |
|---|---|---|
| `DRAFT` | Editável pelo profissional autorizado, com controle de versão. | Editar, visualizar prévia, emitir. |
| `ISSUED` | Snapshot e PDF finais imutáveis. | Consultar, baixar, iniciar retificação, anular com justificativa. |
| `VOIDED` | Snapshot e PDF originais preservados; evento de anulação separado. | Consultar histórico e prova da anulação. Não editar, emitir ou anular novamente. |

Transições: `DRAFT → ISSUED → VOIDED`. Retificação não edita a emissão anterior: `ISSUED → novo DRAFT vinculado → novo ISSUED`. O documento anterior continua consultável e aparece como superado por relação derivada do novo documento; seu snapshot não muda. Não há exclusão física de documentos emitidos ou anulados. Alterar documento fora de `DRAFT`, emitir duas vezes ou anular duas vezes retorna `409`. Campos obrigatórios inválidos impedem emissão com erro de validação.

## Emissão e retificação

1. O profissional seleciona tipo, paciente e conteúdo; o rascunho guarda `version` para detectar edição concorrente.
2. A prévia usa o mesmo template e dados que serão congelados. Antes de emitir, a API verifica papel, habilitação aplicável, campos do tipo documental e versão atual.
3. A emissão cria em uma transação um snapshot tipado, identificador de cadeia/versão, hash do conteúdo e evento de auditoria. Repetir a mesma requisição idempotente devolve o resultado original.
4. O PDF é gerado a partir do snapshot, armazenado em bucket privado e associado à emissão. A emissão só se apresenta como concluída quando o PDF está disponível; uma falha impede a conclusão e deve permitir nova tentativa segura.
5. Retificar cria um novo rascunho com `replacesDocumentId`, preenchido a partir do snapshot anterior. A nova emissão recebe o próximo número da cadeia (`v2`, `v3`...). O original continua íntegro e o histórico mostra a substituição.
6. Anular exige justificativa, autor, instante e auditoria. O snapshot e o PDF originais continuam acessíveis com indicação clara de anulação; não se substitui silenciosamente o arquivo original.

## Snapshot mínimo

O snapshot guarda apenas os dados que efetivamente aparecem e são exigidos para o tipo emitido: tipo e versão do documento, conteúdo estruturado e template usado; identificação do paciente; identificação e registro profissional aplicável do emissor; dados necessários da clínica; data/hora de emissão em UTC e fuso de apresentação; autoria; hash do conteúdo renderizado. Medicamentos, posologia, endereço e outros campos específicos são incluídos quando o tipo exigir. Mudanças posteriores em paciente, profissional, clínica ou modelo não alteram o documento emitido.

O PDF e o snapshot são privados e ficam sempre vinculados ao `organizationId`. A API autoriza cada consulta e transmite o arquivo sem expor o bucket publicamente. No MVP não há expurgo de documentos emitidos. Para documentos integrantes do prontuário, a política definitiva deve respeitar ao menos o prazo legal de guarda do prontuário e ser aprovada pela clínica; a [Lei 13.787/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm) prevê prazo mínimo de 20 anos desde o último registro antes de eventual eliminação.

## Formato e validade

O estado `ISSUED` significa finalizado **dentro do Flowcare para impressão**. Ele não afirma que o PDF seja uma prescrição ou atestado eletrônico legalmente assinado. A interface e o arquivo devem indicar que a assinatura manual no papel ainda é necessária; baixar ou compartilhar o PDF sem assinatura não o transforma em documento eletrônico assinado.

Receitas controladas exigem regras próprias de modelo, numeração e assinatura e estão fora do MVP. A API não oferece esse tipo nem um documento genérico que possa servir como atalho. A [Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-fisico) mantém modelos físicos vigentes; sua [orientação sobre receituário eletrônico](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/receituario-eletronico) e [perguntas e respostas da RDC 1.000/2025](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/controlados/sncr/perguntas-e-respostas/perguntas-e-respostas-rdc-1000-2025-1-ed) devem ser revisadas antes de qualquer entrega desse tipo.

## Execução rastreada

Arquivos privados usam o serviço de storage da issue #205. As chaves sempre
começam por `organizations/<organizationId>/`; URLs de upload expiram em até
10 minutos e URLs de download em até 15 minutos. O bucket não deve expor
domínio público. Áudios brutos e PDFs emitidos exigem regras de lifecycle
configuradas no bucket específico de arquivos, separadas do bucket de backups.

Rascunho #273; validação e snapshot #274; emissão #275; PDF #276; consulta e versões #277; anulação #278; interface #279–#285; QA #286. Os campos de cada tipo exigem revisão clínica em #274. O ADR de renderização [ADR-003](adr/ADR-003-pdf-renderer.md) continua proposto e precisa de um spike em #276 antes da escolha entre processo Bun e worker separado.
