import { Elysia } from "elysia";
import type { PrismaClient } from "../generated/prisma/client";
import { Unauthenticated } from "../modules/auth/errors";
import { verifySessionToken } from "../services/session-token";

const SESSION_ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Plugin de autenticação: transforma `Authorization: Bearer <jwt>` em
 * `auth: { userId, sessionId }` tipado, validando a Session viva no banco
 * (revogação imediata — #192/#209).
 *
 * Instância Elysia nomeada (dedup) com derive `scoped`: rotas registradas
 * DEPOIS do `.use(authPlugin(...))` ficam protegidas; as de antes, públicas.
 * Erros de domínio sobem para o onError da aplicação (envelope §2).
 */
export function authPlugin(deps: { prisma: PrismaClient; jwtSecret: string }) {
  return new Elysia({ name: "auth" }).derive(
    { as: "scoped" },
    async ({ headers }) => {
      const bearer = headers.authorization;
      if (!bearer?.startsWith("Bearer ")) throw Unauthenticated();

      const claims = verifySessionToken(bearer.slice(7), deps.jwtSecret);
      if (!claims) throw Unauthenticated();

      const now = new Date();
      const session = await deps.prisma.session.findFirst({
        where: {
          id: claims.sid,
          userId: claims.sub,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, lastActiveAt: true },
      });
      if (!session) throw Unauthenticated();

      const activityCutoff = new Date(
        now.getTime() - SESSION_ACTIVITY_WRITE_INTERVAL_MS,
      );
      if (session.lastActiveAt < activityCutoff) {
        await deps.prisma.session.updateMany({
          where: {
            id: session.id,
            userId: claims.sub,
            revokedAt: null,
            expiresAt: { gt: now },
            lastActiveAt: { lt: activityCutoff },
          },
          data: { lastActiveAt: now },
        });
      }

      return { auth: { userId: claims.sub, sessionId: session.id } };
    },
  );
}
