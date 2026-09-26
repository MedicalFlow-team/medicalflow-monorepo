# ADR-003: Renderizador de PDF

- **Status:** Proposed
- **Issue:** BE-04 / #13

## Contexto

O requisito da BE-14 define BlockNote JSON → HTML/CSS → PDF com Chromium headless e fidelidade WYSIWYG. O documento deve manter formato A4.

## Alternativas

- Executar Chromium no runtime Bun.
- Isolar a geração de PDF em um worker Node.

## Recomendação provisória

Manter o renderizador desacoplado do restante do backend e avaliar Chromium no Bun primeiro, preservando o worker Node como alternativa caso a validação não seja satisfatória.

## Decisão pendente

A decisão final depende dos resultados da BE-01 e da validação de Chromium/PDF no container pela INF-02. Este ADR não escolhe definitivamente entre as alternativas.