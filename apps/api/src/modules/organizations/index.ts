import { Elysia, t } from "elysia";
import type { PrismaClient } from "../../generated/prisma/client";
import { authPlugin } from "../../plugins/auth";
import {
  clinicAddressBody,
  clinicContactBody,
  clinicDetailsResponse,
  organizationsResponse,
} from "./model";
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
    })
    .get(
      "/organizations/:orgSlug/onboarding-details",
      ({ auth, params }) =>
        service.getClinicDetails(auth.userId, params.orgSlug),
      {
        params: t.Object({
          orgSlug: t.String({ minLength: 2, maxLength: 60 }),
        }),
        response: { 200: clinicDetailsResponse },
      },
    )
    .put(
      "/organizations/:orgSlug/onboarding-contact",
      ({ auth, params, body }) =>
        service.saveClinicContact(auth.userId, params.orgSlug, body),
      {
        params: t.Object({
          orgSlug: t.String({ minLength: 2, maxLength: 60 }),
        }),
        body: clinicContactBody,
        response: { 200: clinicDetailsResponse },
      },
    )
    .put(
      "/organizations/:orgSlug/onboarding-address",
      ({ auth, params, body }) =>
        service.saveClinicAddress(auth.userId, params.orgSlug, body),
      {
        params: t.Object({
          orgSlug: t.String({ minLength: 2, maxLength: 60 }),
        }),
        body: clinicAddressBody,
        response: { 200: clinicDetailsResponse },
      },
    );
}
