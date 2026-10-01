import { Elysia } from "elysia";
import { authPlugin } from "../../plugins/auth";
import * as m from "./model";
import type { OrganizationsDeps } from "./service";
import { OrganizationsService } from "./service";

export function organizationsModule(deps: OrganizationsDeps) {
  const service = new OrganizationsService({ prisma: deps.prisma });

  return new Elysia({ name: "organizations" })
    .use(authPlugin({ prisma: deps.prisma, jwtSecret: deps.jwtSecret }))
    .get("/organizations", ({ auth }) => service.list(auth.userId), {
      response: { 200: m.organizationsResponse },
    });
}
