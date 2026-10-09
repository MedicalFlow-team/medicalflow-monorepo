import { t } from "elysia";

/**
 * Schemas TypeBox para o módulo account (Issue #332 / docs/API_CONTRACT.md §3 Módulo 14).
 * Fontes de verdade tipadas para validação de entrada e saída.
 */

export const changePasswordBody = t.Object(
  {
    currentPassword: t.String({ minLength: 1, maxLength: 72 }),
    newPassword: t.String({ minLength: 8, maxLength: 72 }),
  },
  { additionalProperties: false },
);

export const changePasswordResponse = t.Object(
  {
    message: t.String(),
  },
  { additionalProperties: false },
);

export const sessionItem = t.Object(
  {
    id: t.String(),
    isCurrent: t.Boolean(),
    ipAddress: t.Nullable(t.String({ maxLength: 45 })),
    userAgent: t.Nullable(t.String({ maxLength: 32 })),
    lastActiveAt: t.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export const sessionsResponse = t.Object(
  {
    sessions: t.Array(sessionItem),
  },
  { additionalProperties: false },
);

export const profileResponse = t.Object(
  {
    id: t.String(),
    fullName: t.String(),
    email: t.String({ format: "email" }),
  },
  { additionalProperties: false },
);

export type ChangePasswordBody = typeof changePasswordBody.static;
export type ChangePasswordResponse = typeof changePasswordResponse.static;
export type SessionItem = typeof sessionItem.static;
export type SessionsResponse = typeof sessionsResponse.static;
export type ProfileResponse = typeof profileResponse.static;
