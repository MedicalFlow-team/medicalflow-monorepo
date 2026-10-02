/**
 * Env tipado — carregado uma única vez no boot (fail-fast).
 *
 * Regras:
 * - Variável obrigatória NUNCA tem default: erro de boot com nome claro.
 * - URLs e segredos vêm do ambiente; produção define tudo
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
    corsOrigin: required("CORS_ORIGIN"),
    wahaBaseUrl: required("WAHA_BASE_URL"),
    wahaApiKey: process.env.WAHA_API_KEY ?? null,
    webAppUrl: required("APP_WEB_URL"),
  };
}
