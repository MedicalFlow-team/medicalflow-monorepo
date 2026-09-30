import { t } from "elysia";

/**
 * Contrato do módulo onboarding (docs/API_CONTRACT.md §3 Módulo 2).
 * Escopo do PR: progresso (#215) e criação da primeira clínica (#216).
 * Profile/hours/complete entram nas issues seguintes — sem overengineering.
 */

export const createOrganizationBody = t.Object({
  name: t.String({ minLength: 2, maxLength: 120 }),
  slug: t.Optional(
    t.String({
      minLength: 2,
      maxLength: 60,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    }),
  ),
});

export const progressResponse = t.Object({
  currentStep: t.String(),
  completed: t.Boolean(),
  draftData: t.Record(t.String(), t.Unknown()),
  version: t.Number(),
});

export const organizationCreatedResponse = t.Object({
  organization: t.Object({
    id: t.String(),
    name: t.String(),
    slug: t.String(),
    role: t.Union([
      t.Literal("ADMIN"),
      t.Literal("PROFESSIONAL"),
      t.Literal("RECEPTIONIST"),
    ]),
    isOwner: t.Boolean(),
  }),
});

export type CreateOrganizationBody = typeof createOrganizationBody.static;
export type ProgressResponse = typeof progressResponse.static;
