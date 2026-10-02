/**
 * Env tipado — carregado uma única vez no boot (fail-fast).
 *
 * Regras:
 * - Variável obrigatória NUNCA tem default: erro de boot com nome claro.
 * - Defaults existem só para desenvolvimento local; produção define tudo
 *   via /root/medflow/.env (ver docs/infra/SECRETS.md).
 */
export interface Env {
  port: number;
  nodeEnv: string;
  version: string;
  jwtSecret: string;
  databaseUrl: string;
  corsOrigin: string;
  wahaBaseUrl: string;
  wahaApiKey: string | null;
  /** Base pública do front (usada nos links de e-mail). */
  webAppUrl: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[boot] Variável obrigatória ausente: ${name}. Copie .env.example → .env e preencha (docs/infra/SECRETS.md).`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export function loadEnv(): Env {
  return {
    port: Number(optional("PORT", "3000")),
    nodeEnv: optional("NODE_ENV", "development"),
    version: optional("APP_VERSION", "0.1.0"),
    jwtSecret: required("JWT_SECRET"),
    databaseUrl: required("DATABASE_URL"),
    corsOrigin: optional("CORS_ORIGIN", "http://localhost:3000"),
    wahaBaseUrl: optional("WAHA_BASE_URL", "http://localhost:3002"),
    wahaApiKey: process.env.WAHA_API_KEY ?? null,
    webAppUrl: optional("APP_WEB_URL", "http://localhost:3000"),
  };
}
