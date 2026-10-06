import { afterEach, expect, test } from "bun:test";
import { loadEnv } from "../src/config/env";

const requiredUrls = ["CORS_ORIGIN", "WAHA_BASE_URL", "APP_WEB_URL"] as const;
const keys = [
  ...requiredUrls,
  "NODE_ENV",
  "AWS_REGION",
  "MAIL_FROM",
  "MAIL_PROVIDER",
  "TRUST_PROXY",
] as const;
const original = new Map(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("proxy confiável exige ativação explícita", () => {
  const jwt = process.env.JWT_SECRET;
  const db = process.env.DATABASE_URL;
  process.env.JWT_SECRET = "test-only";
  process.env.DATABASE_URL = "postgresql://unused";
  process.env.CORS_ORIGIN = "https://web.test";
  process.env.WAHA_BASE_URL = "https://waha.test";
  process.env.APP_WEB_URL = "https://web.test";
  try {
    delete process.env.TRUST_PROXY;
    expect(loadEnv().trustProxy).toBe(false);
    process.env.TRUST_PROXY = "true";
    expect(loadEnv().trustProxy).toBe(true);
    process.env.TRUST_PROXY = "invalid";
    expect(() => loadEnv()).toThrow("TRUST_PROXY deve ser true ou false");
  } finally {
    if (jwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwt;
    if (db === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = db;
  }
});

test("URLs obrigatórias não usam endereços locais como fallback", () => {
  // loadEnv valida JWT_SECRET e DATABASE_URL antes das URLs.
  const jwt = process.env.JWT_SECRET;
  const db = process.env.DATABASE_URL;
  process.env.JWT_SECRET = "test-only";
  process.env.DATABASE_URL = "postgresql://unused";
  try {
    process.env.NODE_ENV = "development";
    delete process.env.MAIL_PROVIDER;
    for (const missing of requiredUrls) {
      for (const key of requiredUrls) process.env[key] = "http://service.test";
      delete process.env[missing];
      expect(() => loadEnv()).toThrow(missing);
    }
  } finally {
    if (jwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwt;
    if (db === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = db;
  }
});

test("produção inicia sem e-mail e exige configuração somente ao ativar SES", () => {
  const jwt = process.env.JWT_SECRET;
  const db = process.env.DATABASE_URL;
  process.env.JWT_SECRET = "test-only";
  process.env.DATABASE_URL = "postgresql://unused";
  process.env.CORS_ORIGIN = "https://web.test";
  process.env.WAHA_BASE_URL = "https://waha.test";
  process.env.APP_WEB_URL = "https://web.test";
  process.env.NODE_ENV = "production";
  try {
    delete process.env.AWS_REGION;
    delete process.env.MAIL_FROM;
    delete process.env.MAIL_PROVIDER;
    expect(loadEnv().mailProvider).toBe("disabled");
    process.env.MAIL_PROVIDER = "console";
    expect(() => loadEnv()).toThrow("não é permitido em produção");
    process.env.MAIL_PROVIDER = "ses";
    expect(() => loadEnv()).toThrow("AWS_REGION e MAIL_FROM");
    process.env.AWS_REGION = "sa-east-1";
    process.env.MAIL_FROM = "Flowcare <no-reply@web.test>";
    expect(loadEnv()).toMatchObject({
      mailProvider: "ses",
      sesRegion: "sa-east-1",
      mailFrom: "Flowcare <no-reply@web.test>",
    });
    process.env.NODE_ENV = "test";
    expect(() => loadEnv()).toThrow("não enviam e-mails externos");
    process.env.MAIL_PROVIDER = "invalid";
    expect(() => loadEnv()).toThrow("MAIL_PROVIDER deve ser");
  } finally {
    if (jwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = jwt;
    if (db === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = db;
  }
});
