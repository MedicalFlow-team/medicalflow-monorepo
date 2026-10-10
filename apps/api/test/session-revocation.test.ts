import { describe, expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { PrismaClient } from "../src/generated/prisma/client";
import { signSessionToken } from "../src/services/session-token";

const env: Env = {
  port: 0,
  nodeEnv: "test",
  version: "test",
  jwtSecret: "revocation-test-secret",
  databaseUrl: "postgresql://unused",
  corsOrigin: "http://localhost:3000",
  trustProxy: false,
  wahaBaseUrl: "http://127.0.0.1:1",
  wahaApiKey: null,
  webAppUrl: "http://localhost:3000",
  sesRegion: null,
  mailProvider: "disabled",
  mailFrom: null,
};

type Session = {
  id: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  lastActiveAt: Date;
};
type Audit = {
  userId: string;
  actorSessionId: string;
  targetSessionId?: string;
  action: string;
  revokedCount: number;
};

function setup() {
  const expiresAt = new Date(Date.now() + 60_000);
  const sessions: Session[] = [
    {
      id: "current",
      userId: "a",
      revokedAt: null,
      expiresAt,
      lastActiveAt: new Date(),
    },
    {
      id: "session-other",
      userId: "a",
      revokedAt: null,
      expiresAt,
      lastActiveAt: new Date(),
    },
    {
      id: "third",
      userId: "a",
      revokedAt: null,
      expiresAt,
      lastActiveAt: new Date(),
    },
    {
      id: "foreign",
      userId: "b",
      revokedAt: null,
      expiresAt,
      lastActiveAt: new Date(),
    },
  ];
  const audits: Audit[] = [];
  const prisma = {
    $transaction: async (operation: (tx: PrismaClient) => Promise<unknown>) =>
      operation(prisma as PrismaClient),
    session: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; userId: string };
      }) => {
        const session = sessions.find(
          (s) =>
            s.id === where.id &&
            s.userId === where.userId &&
            !s.revokedAt &&
            s.expiresAt > new Date(),
        );
        return session
          ? { id: session.id, lastActiveAt: session.lastActiveAt }
          : null;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id?: string | { not: string }; userId: string };
        data: { revokedAt?: Date };
      }) => {
        let count = 0;
        for (const session of sessions) {
          if (
            session.userId !== where.userId ||
            session.revokedAt ||
            session.expiresAt <= new Date()
          )
            continue;
          if (typeof where.id === "string" && session.id !== where.id) continue;
          if (typeof where.id === "object" && session.id === where.id.not)
            continue;
          session.revokedAt = data.revokedAt ?? null;
          count++;
        }
        return { count };
      },
      findMany: async () => [],
    },
    sessionRevocationAudit: {
      create: async ({ data }: { data: Audit }) => {
        audits.push(data);
        return data;
      },
    },
  } as unknown as PrismaClient;
  const app = createApp(env, { prisma, mailer: { send: async () => {} } });
  const token = (sid: string, sub = "a") =>
    signSessionToken({ sid, sub }, env.jwtSecret, 3600);
  const request = (path: string, sid: string, method = "DELETE") =>
    app.handle(
      new Request(`http://localhost/api${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token(sid, sid === "foreign" ? "b" : "a")}`,
        },
      }),
    );
  return { sessions, audits, request };
}

describe("#333 session revocation", () => {
  test("revokes one owned session, audits it, and rejects its token on next request", async () => {
    const { request, sessions, audits } = setup();
    const response = await request("/me/sessions/session-other", "current");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revokedCount: 1 });
    expect(
      sessions.find((s) => s.id === "session-other")?.revokedAt,
    ).toBeInstanceOf(Date);
    expect(audits).toEqual([
      {
        userId: "a",
        actorSessionId: "current",
        targetSessionId: "session-other",
        action: "SINGLE",
        revokedCount: 1,
      },
    ]);
    expect((await request("/me/profile", "session-other", "GET")).status).toBe(
      401,
    );
    expect((await request("/me/sessions", "current", "GET")).status).toBe(200);
  });

  test("cannot revoke a different account's session or audit a failed attempt", async () => {
    const { request, sessions, audits } = setup();
    const response = await request("/me/sessions/foreign", "current");
    expect(response.status).toBe(404);
    expect(
      ((await response.json()) as { error: { code: string } }).error.code,
    ).toBe("NOT_FOUND");
    expect(sessions.find((s) => s.id === "foreign")?.revokedAt).toBeNull();
    expect(audits).toHaveLength(0);
  });

  test("revokes all other sessions, keeps current and foreign sessions active, and audits count", async () => {
    const { request, sessions, audits } = setup();
    const response = await request("/me/sessions/other", "current");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revokedCount: 2 });
    expect(sessions.find((s) => s.id === "current")?.revokedAt).toBeNull();
    expect(sessions.find((s) => s.id === "foreign")?.revokedAt).toBeNull();
    expect(audits).toEqual([
      {
        userId: "a",
        actorSessionId: "current",
        action: "OTHER",
        revokedCount: 2,
      },
    ]);
    expect((await request("/me/sessions", "session-other", "GET")).status).toBe(
      401,
    );
    expect((await request("/me/sessions", "current", "GET")).status).toBe(200);
  });

  test("revoking current session invalidates its own token", async () => {
    const { request } = setup();
    expect((await request("/me/sessions/current", "current")).status).toBe(200);
    expect((await request("/me/sessions", "current", "GET")).status).toBe(401);
  });
});
