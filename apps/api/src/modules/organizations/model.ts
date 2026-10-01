import { t } from "elysia";

/** #227: somente vínculos ACTIVE; active descreve o vínculo, não a sessão. */
export const organizationSummary = t.Object(
  {
    id: t.String(),
    name: t.String(),
    slug: t.String(),
    role: t.Union([
      t.Literal("ADMIN"),
      t.Literal("PROFESSIONAL"),
      t.Literal("RECEPTIONIST"),
    ]),
    active: t.Literal(true),
  },
  { additionalProperties: false },
);

export const organizationsResponse = t.Object(
  { data: t.Array(organizationSummary) },
  { additionalProperties: false },
);

export type OrganizationsResponse = typeof organizationsResponse.static;
