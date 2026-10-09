import { Elysia } from "elysia";
import type { PrismaClient } from "../../generated/prisma/client";
import { authPlugin } from "../../plugins/auth";
import * as m from "./model";
import { AccountService } from "./service";

export interface AccountModuleDeps {
  prisma: PrismaClient;
  jwtSecret: string;
}

export function accountModule(deps: AccountModuleDeps) {
  const service = new AccountService({ prisma: deps.prisma });

  return new Elysia({ name: "account" })
    .use(authPlugin({ prisma: deps.prisma, jwtSecret: deps.jwtSecret }))
    .post(
      "/me/change-password",
      ({ auth, body }) =>
        service.changePassword(auth.userId, auth.sessionId, body),
      {
        body: m.changePasswordBody,
        response: { 200: m.changePasswordResponse },
      },
    )
    .get(
      "/me/sessions",
      ({ auth }) => service.listSessions(auth.userId, auth.sessionId),
      {
        response: { 200: m.sessionsResponse },
      },
    );
}
