import { afterEach, expect, test } from "bun:test";
import { loadEnv } from "../src/config/env";

const keys = ["CORS_ORIGIN", "WAHA_BASE_URL", "APP_WEB_URL"] as const;
const original = new Map(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("URLs obrigatórias não usam endereços locais como fallback", () => {
  // loadEnv valida JWT_SECRET e DATABASE_URL antes das URLs.
  const jwt = process.env.JWT_SECRET;
  const db = process.env.DATABASE_URL;
  process.env.JWT_SECRET = "test-only";
  process.env.DATABASE_URL = "postgresql://unused";
  try {
    for (const missing of keys) {
      for (const key of keys) process.env[key] = "http://service.test";
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
