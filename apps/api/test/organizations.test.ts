import { describe, expect, mock, test } from "bun:test";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { signSessionToken } from "../src/services/session-token";

const testEnv: Env = {
  port: 0,
  nodeEnv: "test",
  version: "test",
  jwtSecret: "organizations-test-secret",
  databaseUrl: "postgresql://unused",
  corsOrigin: "http://localhost:3000",
  wahaBaseUrl: "http://127.0.0.1:1",
  wahaApiKey: null,
  webAppUrl: "http://localhost:3000",
};

type MembershipResult = Prisma.MembershipGetPayload<{
  select: {
    role: true;
    organization: { select: { id: true; name: true; slug: true } };
  };
}>;

function setup(rows: MembershipResult[] = [], sessionExists = true) {
  const findMany = mock(async (_args: Prisma.MembershipFindManyArgs) => rows);
  const findSession = mock(async (_args: Prisma.SessionFindFirstArgs) =>
    sessionExists ? { id: "session-a" } : null,
  );
  // Só a persistência é substituída; app, authPlugin e JWT são reais.
  const prisma = {
    membership: { findMany },
    session: { findFirst: findSession },
  } as unknown as PrismaClient;
  const app = createApp(testEnv, { prisma, mailer: { send: async () => {} } });
  const token = signSessionToken(
    { sid: "session-a", sub: "user-a" },
    testEnv.jwtSecret,
    3600,
  );

  function get(authorization?: string, query = "") {
    return app.handle(
      new Request(`http://localhost/api/organizations${query}`, {
        headers: authorization ? { authorization } : {},
      }),
    );
  }

  return { get, token, findMany, findSession };
}

describe("#227 GET /api/organizations (persistência simulada)", () => {
  test.each([
    undefined,
    "Bearer invalid",
    "Basic invalid",
  ])("autenticação ausente/inválida (%s) → 401 sem consultar vínculos", async (authorization) => {
    const { get, findMany, findSession } = setup();
    const res = await get(authorization);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: "Sessão ausente, inválida ou encerrada.",
      },
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(findSession).not.toHaveBeenCalled();
  });

  test("sessão inexistente, revogada ou expirada → 401", async () => {
    const { get, token, findMany, findSession } = setup([], false);
    const res = await get(`Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
    expect(findSession).toHaveBeenCalledWith({
      where: {
        id: "session-a",
        userId: "user-a",
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      select: { id: true },
    });
  });

  test("JWT expirado → 401 antes da consulta de sessão", async () => {
    const { get, findMany, findSession } = setup();
    const token = signSessionToken(
      { sid: "session-a", sub: "user-a" },
      testEnv.jwtSecret,
      -1,
    );
    expect((await get(`Bearer ${token}`)).status).toBe(401);
    expect(findSession).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  test("conta sem memberships → 200 com data vazia", async () => {
    const { get, token } = setup();
    const res = await get(`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [] });
  });

  test("userId do cliente não altera o filtro ACTIVE da conta autenticada", async () => {
    const { get, token, findMany } = setup();
    const res = await get(`Bearer ${token}`, "?userId=user-b&status=INVITED");
    expect(res.status).toBe(200);
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-a", status: "ACTIVE" },
      select: {
        role: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { organization: { slug: "asc" } },
      take: 100,
    });
  });

  test.each([
    "ADMIN",
    "PROFESSIONAL",
    "RECEPTIONIST",
  ] as const)("retorna papel %s e apenas os cinco campos permitidos", async (role) => {
    const organization = {
      id: "org-a",
      name: "Clínica Alfa",
      slug: "clinica-alfa",
      ownerId: "private-owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      subscription: { priceCents: 8900, status: "PENDING_PAYMENT" },
    };
    const { get, token } = setup([{ role, organization }]);
    const res = await get(`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [
        {
          id: "org-a",
          name: "Clínica Alfa",
          slug: "clinica-alfa",
          role,
          active: true,
        },
      ],
    });
  });

  test("retorna duas clínicas sem consultas individuais por organização", async () => {
    const rows: MembershipResult[] = [
      {
        role: "ADMIN",
        organization: { id: "org-a", name: "Alfa", slug: "alfa" },
      },
      {
        role: "RECEPTIONIST",
        organization: { id: "org-b", name: "Beta", slug: "beta" },
      },
    ];
    const { get, token, findMany } = setup(rows);
    const res = await get(`Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [
        {
          id: "org-a",
          name: "Alfa",
          slug: "alfa",
          role: "ADMIN",
          active: true,
        },
        {
          id: "org-b",
          name: "Beta",
          slug: "beta",
          role: "RECEPTIONIST",
          active: true,
        },
      ],
    });
    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
