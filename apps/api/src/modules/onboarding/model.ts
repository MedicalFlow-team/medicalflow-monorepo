import { t } from "elysia";

/**
 * Contrato do módulo onboarding (docs/API_CONTRACT.md §3 Módulo 2).
 * Progresso, perfil, criação da clínica, horários opcionais e conclusão.
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

export const profileBody = t.Object({
  fullName: t.String({ minLength: 3, maxLength: 120 }),
  phone: t.String({ minLength: 10, maxLength: 20 }),
  professionalRole: t.Union([
    t.Literal("MANAGEMENT"),
    t.Literal("CLINICAL"),
    t.Literal("RECEPTION"),
  ]),
  professionalTitle: t.Optional(t.String({ maxLength: 120 })),
  registrationNumber: t.Optional(t.String({ maxLength: 80 })),
});

export const profileDraftBody = t.Object({
  fullName: t.String({ maxLength: 120 }),
  phone: t.String({ maxLength: 20 }),
  professionalRole: t.Union([
    t.Literal("MANAGEMENT"),
    t.Literal("CLINICAL"),
    t.Literal("RECEPTION"),
  ]),
  professionalTitle: t.String({ maxLength: 120 }),
  registrationNumber: t.String({ maxLength: 80 }),
});

export const profileResponse = t.Object({
  fullName: t.String(),
  phone: t.Union([t.String(), t.Null()]),
  professionalRole: t.Union([t.String(), t.Null()]),
  professionalTitle: t.Union([t.String(), t.Null()]),
  registrationNumber: t.Union([t.String(), t.Null()]),
  completed: t.Boolean(),
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

export const slugAvailabilityResponse = t.Object({
  available: t.Boolean(),
  slug: t.String(),
});

export const weeklyScheduleRule = t.Object({
  dayOfWeek: t.Union([
    t.Literal("MONDAY"),
    t.Literal("TUESDAY"),
    t.Literal("WEDNESDAY"),
    t.Literal("THURSDAY"),
    t.Literal("FRIDAY"),
    t.Literal("SATURDAY"),
    t.Literal("SUNDAY"),
  ]),
  startTime: t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }),
  endTime: t.String({ pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }),
  slotDurationMinutes: t.Integer({ minimum: 1, maximum: 1440 }),
});

export const scheduleRulesBody = t.Object({
  weeklySchedule: t.Array(weeklyScheduleRule, { maxItems: 100 }),
});

export const completeResponse = t.Object({ redirectUrl: t.String() });

export type CreateOrganizationBody = typeof createOrganizationBody.static;
export type ProgressResponse = typeof progressResponse.static;
export type ProfileBody = typeof profileBody.static;
export type ProfileDraftBody = typeof profileDraftBody.static;
export type SlugAvailabilityResponse = typeof slugAvailabilityResponse.static;
export type ScheduleRulesBody = typeof scheduleRulesBody.static;
