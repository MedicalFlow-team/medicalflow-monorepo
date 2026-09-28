-- Extensões exigidas pela busca de pacientes (docs/API_CONTRACT.md):
--   unaccent → busca ignorando acentos ("maria oli" acha "Maria Oliveira")
--   pg_trgm  → índice trigram para LIKE parcial eficiente
-- Executado automaticamente no PRIMEIRO init do volume (docker-entrypoint-initdb.d).
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
