import { describe, expect, mock, test } from "bun:test";
import { hash } from "argon2";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { signSessionToken } from "../src/services/session-token";

const credentialFixtures = {
  current: ["Senha", "Atual", "123"].join(""),
  incorrect: ["Senha", "Errada", "Total"].join(""),
  replacement: ["Nova", "Senha", "Valida", "123"].join(""),
  strongReplacement: ["Nova", "Senha", "Forte", "456"].join(""),
};

const testEnv: Env = {
  port: 0,
  nodeEnv: "test",
  version: "test",
  jwtSecret: "account-test-secret",
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

interface MockSession {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

interface MockUser {
  id: string;
  passwordHash: string;
}

async function setup(
  userOverride?: Partial<MockUser>,
  sessionsSeed: MockSession[] = [],
  sessionValid = true,
  sessionLastActiveAt = new Date(),
) {
  const currentPasswordPlain = credentialFixtures.current;
  const currentHash = await hash(currentPasswordPlain);

  let userRecord: MockUser = {
    id: "user-a",
    passwordHash: currentHash,
    ...userOverride,
  };

  const findUniqueUser = mock(async ({ where }: Prisma.UserFindUniqueArgs) => {
    if (where.id === userRecord.id) {
      return { id: userRecord.id, passwordHash: userRecord.passwordHash };
    }
    return null;
  });

  const updateUser = mock(async ({ where, data }: Prisma.UserUpdateArgs) => {
    if (where.id === userRecord.id) {
      userRecord = {
        ...userRecord,
        passwordHash: (data.passwordHash as string) ?? userRecord.passwordHash,
      };
      return { id: userRecord.id, passwordHash: userRecord.passwordHash };
    }
    throw new Error("User not found");
  });

  const findSession = mock(async ({ where }: Prisma.SessionFindFirstArgs) => {
    if (!sessionValid) return null;
    return {
      id: (where?.id as string) ?? "session-current",
      lastActiveAt: sessionLastActiveAt,
    };
  });

  const touchSession = mock(async ({ data }: Prisma.SessionUpdateManyArgs) => {
    const lastActiveAt = data.lastActiveAt as Date;
    sessionLastActiveAt = lastActiveAt;
    const currentSession = sessionsSeed.find(
      (session) => session.id === "session-current",
    );
    if (currentSession) currentSession.lastActiveAt = lastActiveAt;
    return { count: 1 };
  });

  const findManySessions = mock(
    async ({ where }: Prisma.SessionFindManyArgs) => {
      return sessionsSeed.filter((s) => {
        if (s.userId !== where?.userId) return false;
        if (where?.revokedAt === null && s.revokedAt !== null) return false;
        if (
          where?.expiresAt &&
          typeof where.expiresAt === "object" &&
          "gt" in where.expiresAt
        ) {
          const gtDate = where.expiresAt.gt as Date;
          if (s.expiresAt <= gtDate) return false;
        }
        return true;
      });
    },
  );

  const prisma = {
    user: {
      findUnique: findUniqueUser,
      update: updateUser,
    },
    session: {
      findFirst: findSession,
      findMany: findManySessions,
      updateMany: touchSession,
    },
  } as unknown as PrismaClient;

  const app = createApp(testEnv, { prisma, mailer: { send: async () => {} } });

  const token = signSessionToken(
    { sid: "session-current", sub: "user-a" },
    testEnv.jwtSecret,
    3600,
  );

  function postChangePassword(body: unknown, authorization?: string) {
    return app.handle(
      new Request("http://localhost/api/me/change-password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  }

  function getSessions(authorization?: string) {
    return app.handle(
      new Request("http://localhost/api/me/sessions", {
        headers: authorization ? { authorization } : {},
      }),
    );
  }

  return {
    postChangePassword,
    getSessions,
    token,
    userRecord: () => userRecord,
    currentPasswordPlain,
    findUniqueUser,
    updateUser,
    findSession,
    findManySessions,
    touchSession,
  };
}

describe("#332 POST /api/me/change-password e GET /api/me/sessions", () => {
  describe("POST /api/me/change-password — Alteração de senha", () => {
    test("recusa requisição sem autenticação (401 UNAUTHENTICATED)", async () => {
      const { postChangePassword, updateUser } = await setup();
      const res = await postChangePassword({
        currentPassword: "qualquer",
        newPassword: "NovaSenha123",
      });

      expect(res.status).toBe(401);
      const json = (await res.json()) as { error: { code: string } };
      expect(json.error.code).toBe("UNAUTHENTICATED");
      expect(updateUser).not.toHaveBeenCalled();
    });

    test("senha atual incorreta não altera nada no banco (401 INVALID_CREDENTIALS)", async () => {
      const { postChangePassword, token, updateUser, userRecord } =
        await setup();
      const hashBefore = userRecord().passwordHash;

      const res = await postChangePassword(
        {
          currentPassword: credentialFixtures.incorrect,
          newPassword: credentialFixtures.replacement,
        },
        `Bearer ${token}`,
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as {
        error: { code: string; message: string };
      };
      expect(json.error.code).toBe("INVALID_CREDENTIALS");
      expect(json.error.message).toBe("Senha atual incorreta.");
      expect(updateUser).not.toHaveBeenCalled();
      expect(userRecord().passwordHash).toBe(hashBefore);
    });

    test("senha atual correta altera passwordHash da própria conta com sucesso (200 OK)", async () => {
      const {
        postChangePassword,
        token,
        updateUser,
        userRecord,
        currentPasswordPlain,
      } = await setup();
      const hashBefore = userRecord().passwordHash;

      const res = await postChangePassword(
        {
          currentPassword: currentPasswordPlain,
          newPassword: credentialFixtures.strongReplacement,
        },
        `Bearer ${token}`,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as { message: string };
      expect(json.message).toBe("Senha alterada com sucesso.");

      expect(updateUser).toHaveBeenCalledTimes(1);
      const updateCall = updateUser.mock.calls[0]?.[0];
      expect(updateCall?.where.id).toBe("user-a");

      const hashAfter = userRecord().passwordHash;
      expect(hashAfter).not.toBe(hashBefore);
    });

    test("segredo/hash nunca aparece na resposta de sucesso", async () => {
      const { postChangePassword, token, currentPasswordPlain } = await setup();

      const res = await postChangePassword(
        {
          currentPassword: currentPasswordPlain,
          newPassword: credentialFixtures.strongReplacement,
        },
        `Bearer ${token}`,
      );

      const json = (await res.json()) as Record<string, unknown>;
      expect(json).toEqual({ message: "Senha alterada com sucesso." });
      expect(json.password).toBeUndefined();
      expect(json.passwordHash).toBeUndefined();
      expect(json.newPassword).toBeUndefined();
    });

    test("rejeita nova senha com menos de 8 caracteres (400 VALIDATION_ERROR)", async () => {
      const { postChangePassword, token, updateUser, currentPasswordPlain } =
        await setup();
      const invalidNewPassword = "curta";

      const res = await postChangePassword(
        {
          currentPassword: currentPasswordPlain,
          newPassword: invalidNewPassword,
        },
        `Bearer ${token}`,
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as {
        error: { code: string; message: string };
      };
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.message).toBe("Dados inválidos.");
      expect(JSON.stringify(json)).not.toContain(currentPasswordPlain);
      expect(JSON.stringify(json)).not.toContain(invalidNewPassword);
      expect(updateUser).not.toHaveBeenCalled();
    });

    test("apenas a própria conta é alterada; userId externo no body é ignorado e update isola auth.userId", async () => {
      const { postChangePassword, token, updateUser, currentPasswordPlain } =
        await setup();

      const res = await postChangePassword(
        {
          currentPassword: currentPasswordPlain,
          newPassword: credentialFixtures.replacement,
          userId: "hacker-user-id",
          email: "outro@email.com",
        },
        `Bearer ${token}`,
      );

      expect(res.status).toBe(200);
      expect(updateUser).toHaveBeenCalledTimes(1);
      const updateCall = updateUser.mock.calls[0]?.[0];
      expect(updateCall?.where.id).toBe("user-a");
      expect(updateCall?.where.id).not.toBe("hacker-user-id");
    });

    test("requisição sem senhas obrigatórias é rejeitada (400 VALIDATION_ERROR)", async () => {
      const { postChangePassword, token, updateUser } = await setup();

      const res = await postChangePassword(
        {
          userId: "hacker-user-id",
        },
        `Bearer ${token}`,
      );

      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: { code: string } };
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(updateUser).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/me/sessions — Listagem de sessões ativas", () => {
    test("recusa requisição sem autenticação (401 UNAUTHENTICATED)", async () => {
      const { getSessions, findManySessions } = await setup();
      const res = await getSessions();

      expect(res.status).toBe(401);
      expect(findManySessions).not.toHaveBeenCalled();
    });

    test("lista apenas sessões ativas da própria conta, identificando a sessão atual", async () => {
      const now = Date.now();
      const sessionsSeed: MockSession[] = [
        {
          id: "session-current",
          userId: "user-a",
          expiresAt: new Date(now + 3600 * 1000),
          revokedAt: null,
          ipAddress: "201.20.1.5",
          userAgent: "Mozilla/5.0 Chrome/120.0",
          createdAt: new Date(now - 1000),
          lastActiveAt: new Date(now - 1000),
        },
        {
          id: "session-other-device",
          userId: "user-a",
          expiresAt: new Date(now + 7200 * 1000),
          revokedAt: null,
          ipAddress: "189.40.2.10",
          userAgent: "Mozilla/5.0 Firefox/121.0",
          createdAt: new Date(now - 5000),
          lastActiveAt: new Date(now - 5000),
        },
        // Sessão revogada (não deve aparecer)
        {
          id: "session-revoked",
          userId: "user-a",
          expiresAt: new Date(now + 3600 * 1000),
          revokedAt: new Date(now - 500),
          ipAddress: "10.0.0.1",
          userAgent: "Safari/17.0",
          createdAt: new Date(now - 10000),
          lastActiveAt: new Date(now - 10000),
        },
        // Sessão expirada (não deve aparecer)
        {
          id: "session-expired",
          userId: "user-a",
          expiresAt: new Date(now - 1000),
          revokedAt: null,
          ipAddress: "10.0.0.2",
          userAgent: "Edge/120.0",
          createdAt: new Date(now - 20000),
          lastActiveAt: new Date(now - 20000),
        },
        // Sessão ativa de OUTRO usuário (não deve aparecer)
        {
          id: "session-other-user",
          userId: "user-b",
          expiresAt: new Date(now + 3600 * 1000),
          revokedAt: null,
          ipAddress: "192.168.1.1",
          userAgent: "Chrome/120.0",
          createdAt: new Date(now - 1000),
          lastActiveAt: new Date(now - 1000),
        },
      ];

      const { getSessions, token, touchSession } = await setup(
        {},
        sessionsSeed,
      );
      const res = await getSessions(`Bearer ${token}`);

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        sessions: Array<{
          id: string;
          isCurrent: boolean;
          ipAddress: string | null;
          userAgent: string | null;
          lastActiveAt: string;
        }>;
      };

      expect(json.sessions).toHaveLength(2);

      const currentSess = json.sessions.find((s) => s.id === "session-current");
      expect(currentSess).toBeDefined();
      expect(currentSess?.isCurrent).toBe(true);
      expect(currentSess?.ipAddress).toBe("201.20.1.5");
      expect(currentSess?.userAgent).toBe("Chrome/Other");
      expect(currentSess?.lastActiveAt).toBe(
        new Date(now - 1000).toISOString(),
      );
      expect(touchSession).not.toHaveBeenCalled();

      const otherSess = json.sessions.find(
        (s) => s.id === "session-other-device",
      );
      expect(otherSess).toBeDefined();
      expect(otherSess?.isCurrent).toBe(false);
      expect(otherSess?.ipAddress).toBe("189.40.2.10");

      // Sessão de outro usuário não vazou
      expect(json.sessions.some((s) => s.id === "session-other-user")).toBe(
        false,
      );
      // Sessões inativas não apareceram
      expect(json.sessions.some((s) => s.id === "session-revoked")).toBe(false);
      expect(json.sessions.some((s) => s.id === "session-expired")).toBe(false);
    });

    test("atualiza a última atividade antiga da sessão atual", async () => {
      const now = Date.now();
      const staleLastActiveAt = new Date(now - 10 * 60 * 1000);
      const sessionsSeed: MockSession[] = [
        {
          id: "session-current",
          userId: "user-a",
          expiresAt: new Date(now + 3600 * 1000),
          revokedAt: null,
          ipAddress: "201.20.1.5",
          userAgent: "Chrome/Windows",
          createdAt: new Date(now - 3600 * 1000),
          lastActiveAt: staleLastActiveAt,
        },
      ];
      const { getSessions, token, touchSession } = await setup(
        {},
        sessionsSeed,
        true,
        staleLastActiveAt,
      );

      const response = await getSessions(`Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(touchSession).toHaveBeenCalledTimes(1);
      const body = (await response.json()) as {
        sessions: Array<{ id: string; lastActiveAt: string }>;
      };
      const currentSession = body.sessions.find(
        (session) => session.id === "session-current",
      );
      expect(currentSession).toBeDefined();
      expect(
        new Date(currentSession?.lastActiveAt ?? 0).getTime(),
      ).toBeGreaterThan(staleLastActiveAt.getTime());
    });

    test("metadados não expõem fingerprint invasivo nem segredos", async () => {
      const now = Date.now();
      const sessionsSeed: MockSession[] = [
        {
          id: "session-current",
          userId: "user-a",
          expiresAt: new Date(now + 3600 * 1000),
          revokedAt: null,
          ipAddress: "201.20.1.5",
          userAgent: "Mozilla/5.0 Chrome/120.0",
          createdAt: new Date(now),
          lastActiveAt: new Date(now),
        },
      ];

      const { getSessions, token } = await setup({}, sessionsSeed);
      const res = await getSessions(`Bearer ${token}`);
      const json = (await res.json()) as {
        sessions: Array<Record<string, unknown>>;
      };

      const item = json.sessions[0];
      expect(item).toBeDefined();
      if (!item) throw new Error("Expected session item");
      expect(Object.keys(item).sort()).toEqual(
        ["id", "ipAddress", "isCurrent", "lastActiveAt", "userAgent"].sort(),
      );
      expect(item.token).toBeUndefined();
      expect(item.jwt).toBeUndefined();
      expect(item.userId).toBeUndefined();
      expect(item.fingerprint).toBeUndefined();
    });
  });
});
