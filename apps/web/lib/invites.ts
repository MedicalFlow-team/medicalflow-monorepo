import { z } from "zod";

export const inviteRoleSchema = z.enum([
  "ADMIN",
  "ADMIN_PROFESSIONAL",
  "PROFESSIONAL",
  "RECEPTIONIST",
]);

export type InviteRole = z.infer<typeof inviteRoleSchema>;

export const inviteDetailsSchema = z.object({
  organizationName: z.string(),
  organizationSlug: z.string(),
  email: z.string().email(),
  role: z.string(),
  expiresAt: z.string(),
});

export type InviteDetails = z.infer<typeof inviteDetailsSchema>;

export function formatInviteRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "ADMIN_PROFESSIONAL":
      return "Administrador e Clínico";
    case "PROFESSIONAL":
      return "Profissional Clínico";
    case "RECEPTIONIST":
      return "Recepção";
    default:
      return role;
  }
}
