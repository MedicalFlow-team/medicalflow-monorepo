import { Elysia } from "elysia";
import type { PrismaClient } from "../generated/prisma/client";
import { Unauthenticated } from "../modules/auth/errors";
import { verifySessionToken } from "../services/session-token";

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

      const session = await deps.prisma.session.findFirst({
        where: {
          id: claims.sid,
          userId: claims.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!session) throw Unauthenticated();

      return { auth: { userId: claims.sub, sessionId: session.id } };
    },
  );
}
