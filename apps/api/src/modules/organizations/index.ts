import { Elysia } from "elysia";
import type { PrismaClient } from "../../generated/prisma/client";
import { authPlugin } from "../../plugins/auth";
import { organizationsResponse } from "./model";
import { OrganizationsService } from "./service";

export function organizationsModule(deps: {
  prisma: PrismaClient;
  jwtSecret: string;
}) {
  const service = new OrganizationsService(deps.prisma);

  return new Elysia({ name: "organizations" })
    .use(authPlugin(deps))
    .get("/organizations", ({ auth }) => service.listForUser(auth.userId), {
      response: { 200: organizationsResponse },
    });
}
