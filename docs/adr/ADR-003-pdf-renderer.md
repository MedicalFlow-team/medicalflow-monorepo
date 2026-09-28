# ADR-003: Renderizador de PDF

- **Status:** Proposed
- **Origem histórica:** issue #13 (taxonomia anterior)

## Contexto

O requisito RF-C6/RNF-11 define BlockNote JSON → HTML/CSS → PDF com Chromium headless e fidelidade WYSIWYG. O documento deve manter formato A4.

## Alternativas

- Executar Chromium no runtime Bun.
- Isolar a geração de PDF em um worker Node.

## Recomendação provisória

Manter o renderizador desacoplado do restante do backend e avaliar Chromium no Bun primeiro, preservando o worker Node como alternativa caso a validação não seja satisfatória.

## Decisão pendente

A decisão final depende de um spike documentado e da validação de Chromium/PDF no container. Este ADR não escolhe definitivamente entre as alternativas.
