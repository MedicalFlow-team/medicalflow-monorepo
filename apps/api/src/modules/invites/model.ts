import { t } from "elysia";

export const createInviteBody = t.Object({
  email: t.String({ format: "email" }),
  role: t.Union([
    t.Literal("ADMIN"),
    t.Literal("PROFESSIONAL"),
    t.Literal("RECEPTIONIST"),
  ]),
});
export const acceptInviteBody = t.Object({
  token: t.String({ minLength: 20 }),
});
export const inviteResponse = t.Object({
  id: t.String(),
  email: t.String(),
  expiresAt: t.String(),
});
export const acceptResponse = t.Object({ organizationSlug: t.String() });
export type CreateInviteBody = typeof createInviteBody.static;
