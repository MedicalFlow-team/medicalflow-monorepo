# ADR-002: Contrato B2B do Sintesy

- **Status:** Proposed
- **Issue:** BE-04 / #13

## Contexto

Registrar o contrato mínimo necessário para a integração B2B do Sintesy, sem definir detalhes de protocolo ausentes dos requisitos.

## Requisitos confirmados

- Usar API key por clínica/aplicação.
- Selecionar o modelo `stt-low`.
- Medir por requisição.
- Definir códigos de erro estáveis.
- Prever fallback para conta de serviço.
- Disponibilizar mock para desenvolvimento.
- A BE-17 referencia a chamada `POST /sintesy/assistant/transcribe/`.

## A validar com o Sintesy

- Formato e transporte da API key e detalhes de requisição/resposta.
- Semântica da medição, inclusive tentativas, falhas e dados de custo disponíveis.
- Mapeamento dos erros da API para códigos estáveis.
- Condições e limites do fallback para conta de serviço.

O comportamento detalhado do mock será definido pela equipe, sem credenciais ou chamadas reais ao Sintesy.

## Consequências

Este ADR registra requisitos, não um contrato de wire format. Os detalhes pendentes devem ser confirmados antes da implementação da BE-17.