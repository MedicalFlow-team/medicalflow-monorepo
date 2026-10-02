import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { PrismaClient } from "../src/generated/prisma/client";

const testEnv: Env = {
  port: 0,
  nodeEnv: "test",
  version: "0.1.0-test",
  jwtSecret: "test_jwt_secret_placeholder",
  databaseUrl: "postgresql://unused",
  // WAHA inexistente: o probe DEVE degradar para "down" sem derrubar o /health
  corsOrigin: "http://localhost:3000",
  wahaBaseUrl: "http://127.0.0.1:1",
  wahaApiKey: null,
  webAppUrl: "http://localhost:3000",
};

// Stub do Prisma: health com banco inacessível deve degradar para "down".
const prismaStub = {
  $queryRaw: async () => Promise.reject(new Error("db down")),
} as unknown as PrismaClient;
const mailerStub = { send: async () => {} };

const app = createApp(testEnv, { prisma: prismaStub, mailer: mailerStub });

describe("GET /api/health", () => {
  test("responde o formato do contrato §12", async () => {
    const res = await app.handle(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      version: string;
      db: string;
      waha: string;
    };
    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.1.0-test");
    expect(body.db).toBe("down");
    expect(["ok", "down"]).toContain(body.waha);
  });

  test("probe do WAHA degradado responde 'down', sem quebrar a rota", async () => {
    const res = await app.handle(new Request("http://localhost/api/health"));
    const body = (await res.json()) as { waha: string };
    expect(body.waha).toBe("down");
  });
});

describe("Envelope de erro (contrato §1)", () => {
  test("rota inexistente → 404 { error: { code: 'NOT_FOUND' } }", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/rota-que-nao-existe"),
    );
    expect(res.status).toBe(404);

    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("NOT_FOUND");
    expect(typeof body.error.message).toBe("string");
  });

  test("rota autenticada sem token → 401 UNAUTHENTICATED", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/onboarding/progress"),
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});
