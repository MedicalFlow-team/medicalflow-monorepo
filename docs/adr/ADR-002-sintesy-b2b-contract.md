# ADR-002: Contrato B2B do Sintesy

- **Status:** Proposed
- **Issue:** BE-04 / #13
- **Fonte:** contrato de API do MedicalFlow (fonte única da equipe)

## Contexto

A integração com o Sintesy fica isolada no backend. O frontend usa a API do MedicalFlow e não acessa credenciais nem o contrato externo diretamente.

No contrato interno, a transcrição entra por `POST /transcriptions`. A BE-17 implementa o cliente upstream do Sintesy e referencia `POST /sintesy/assistant/transcribe/`.

## Contrato mínimo confirmado

- Usar autenticação B2B com API key por clínica/aplicação.
- Manter as credenciais somente no backend.
- Selecionar o modelo `stt-low`.
- Prever fallback para conta de serviço.
- Disponibilizar mock para desenvolvimento, testes e demonstração.
- Fazer retry com backoff; após esgotar as tentativas, mapear a falha externa para `502 UPSTREAM_FAILURE`.
- Medir o uso por requisição/job.
- Registrar, quando disponível: clínica, médico, atendimento, duração, modelo, status, identificador da requisição no Sintesy e custo estimado.
- O modo de credencial previsto é `b2b`, com fallback `service_account`.

O contrato atual considera uma clínica por deploy; por isso a credencial do Sintesy é tratada como configuração única desse ambiente.

## Limite entre API interna e Sintesy

O frontend chama apenas a API do MedicalFlow, por exemplo:

- `POST /transcriptions` para criar o job;
- `GET /transcriptions/{id}` para polling;
- `POST /transcriptions/{id}/retry` para reenvio de job com falha.

A chamada `POST /sintesy/assistant/transcribe/` pertence ao cliente interno do backend e não deve ser exposta diretamente ao frontend.

## A validar com o Sintesy

- Header e formato exato da autenticação B2B.
- Payload e resposta da API externa.
- Formato do identificador de requisição do provedor.
- Taxonomia de erros do Sintesy e mapeamento para os códigos internos.
- Fluxo exato de autenticação da conta de serviço.
- Limites, timeouts e regras de retry aceitos pelo provedor.
- Semântica de cobrança e dados de custo disponibilizados pelo Sintesy.

## Consequências

A BE-17 deve implementar o `SintesyClient` atrás desta fronteira, preservando o contrato interno do MedicalFlow. Detalhes de wire format que não constam na fonte da equipe continuam pendentes de validação com o Sintesy antes da implementação definitiva.
