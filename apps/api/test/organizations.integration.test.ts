import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type {
  MembershipRole,
  MembershipStatus,
  PrismaClient,
} from "../src/generated/prisma/client";
import type { OrganizationsResponse } from "../src/modules/organizations/model";
import { createPrismaClient } from "../src/services/db";
import { signSessionToken } from "../src/services/session-token";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://medflow:medflow@127.0.0.1:5433/medflow";
const prisma: PrismaClient = createPrismaClient(databaseUrl);
const testEnv: Env = {
  port: 0,
  nodeEnv: "test",
  version: "test",
  jwtSecret: "organizations-integration-secret",
  databaseUrl,
  corsOrigin: "http://localhost:3000",
  wahaBaseUrl: "http://127.0.0.1:1",
  wahaApiKey: null,
  webAppUrl: "http://localhost:3000",
};

let dbUp = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  console.warn(
    "#227: integração com PostgreSQL pulada: banco de teste indisponível.",
  );
}

const app = createApp(testEnv, { prisma, mailer: { send: async () => {} } });
const userIds: string[] = [];
const organizationIds: string[] = [];
let userId: string;
let otherUserId: string;
let token: string;
let sessionId: string;

async function createUser() {
  const user = await prisma.user.create({
    data: {
      email: `organizations-${crypto.randomUUID()}@example.test`,
      fullName: "Conta de teste #227",
      passwordHash: "unused",
      emailVerified: true,
    },
  });
  userIds.push(user.id);
  return user.id;
}

async function createMembership(
  memberUserId: string,
  status: MembershipStatus = "ACTIVE",
  role: MembershipRole = "ADMIN",
  slugPrefix = "clinic",
) {
  const organization = await prisma.organization.create({
    data: {
      name: "Clínica de teste",
      slug: `${slugPrefix}-${crypto.randomUUID()}`,
      ownerId: otherUserId,
      subscription: { create: {} },
      memberships: { create: { userId: memberUserId, role, status } },
    },
  });
  organizationIds.push(organization.id);
  return organization;
}

function get(authToken?: string, query = "") {
  return app.handle(
    new Request(`http://localhost/api/organizations${query}`, {
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    }),
  );
}

async function list(query = ""): Promise<OrganizationsResponse> {
  const res = await get(token, query);
  expect(res.status).toBe(200);
  return (await res.json()) as OrganizationsResponse;
}

afterAll(async () => {
  try {
    if (dbUp) {
      // Limpeza restrita às fixtures desta suíte, inclusive após falhas.
      await prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe.skipIf(!dbUp)("#227 organizações (PostgreSQL real)", () => {
  beforeEach(async () => {
    userId = await createUser();
    otherUserId = await createUser();
    const session = await prisma.session.create({
      data: { userId, expiresAt: new Date(Date.now() + 3600_000) },
    });
    sessionId = session.id;
    token = signSessionToken(
      { sid: session.id, sub: userId },
      testEnv.jwtSecret,
      3600,
    );
  });

  test("sem autenticação → 401", async () => {
    const res = await get();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });

  test("sem memberships → lista vazia", async () => {
    expect(await list()).toEqual({ data: [] });
  });

  test.each([
    "ADMIN",
    "PROFESSIONAL",
    "RECEPTIONIST",
  ] as const)("uma clínica ACTIVE: papel %s e nenhum dado administrativo", async (role) => {
    const org = await createMembership(userId, "ACTIVE", role);
    expect(await list()).toEqual({
      data: [
        {
          id: org.id,
          name: org.name,
          slug: org.slug,
          role,
          active: true,
        },
      ],
    });
  });

  test("duas clínicas ACTIVE em ordem estável por slug", async () => {
    const beta = await createMembership(userId, "ACTIVE", "ADMIN", "beta");
    const alfa = await createMembership(
      userId,
      "ACTIVE",
      "PROFESSIONAL",
      "alfa",
    );
    const expected: OrganizationsResponse = {
      data: [
        {
          id: alfa.id,
          name: alfa.name,
          slug: alfa.slug,
          role: "PROFESSIONAL",
          active: true,
        },
        {
          id: beta.id,
          name: beta.name,
          slug: beta.slug,
          role: "ADMIN",
          active: true,
        },
      ],
    };
    expect(await list()).toEqual(expected);
    expect(await list()).toEqual(expected);
  });

  test.each([
    "SUSPENDED",
    "INVITED",
  ] as const)("membership %s não aparece mesmo com vínculo ACTIVE na mesma conta", async (status) => {
    const active = await createMembership(userId);
    await createMembership(userId, status);
    const body = await list();
    expect(body.data.map((org) => org.id)).toEqual([active.id]);
  });

  test("membership ACTIVE de outra conta não aparece nem via userId do cliente", async () => {
    const own = await createMembership(userId);
    await createMembership(otherUserId);
    // Na mesma clínica, o papel da outra conta também não pode vazar.
    await prisma.membership.create({
      data: {
        userId: otherUserId,
        organizationId: own.id,
        role: "RECEPTIONIST",
      },
    });
    const body = await list(`?userId=${otherUserId}`);
    expect(body.data).toEqual([
      {
        id: own.id,
        name: own.name,
        slug: own.slug,
        role: "ADMIN",
        active: true,
      },
    ]);
  });

  test.each([
    "revoked",
    "expired",
  ] as const)("sessão %s → 401", async (state) => {
    await prisma.session.update({
      where: { id: sessionId },
      data:
        state === "revoked"
          ? { revokedAt: new Date() }
          : { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await get(token)).status).toBe(401);
  });

  test("consulta limitada a 100 clínicas em ordem por slug", async () => {
    const organizations = Array.from({ length: 101 }, (_, i) => ({
      id: crypto.randomUUID(),
      ownerId: otherUserId,
      name: "Clínica de teste",
      slug: `limit-${userId}-${String(100 - i).padStart(3, "0")}`,
    }));
    organizationIds.push(...organizations.map((org) => org.id));
    await prisma.organization.createMany({ data: organizations });
    await prisma.membership.createMany({
      data: organizations.map((org) => ({
        organizationId: org.id,
        userId,
        role: "ADMIN" as const,
        status: "ACTIVE" as const,
      })),
    });
    const body = await list();
    expect(body.data).toHaveLength(100);
    expect(body.data.map((org) => org.slug)).toEqual(
      organizations
        .map((org) => org.slug)
        .sort()
        .slice(0, 100),
    );
  });
});
