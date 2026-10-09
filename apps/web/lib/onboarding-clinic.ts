import { z } from "zod";

/**
 * Normalização de slug para URL (compatível com a API e o banco):
 * minúsculas, sem acentos, caracteres especiais substituídos por hífen único.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const clinicInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome da clínica deve ter pelo menos 2 caracteres.")
    .max(120, "O nome da clínica deve ter no máximo 120 caracteres."),
  slug: z
    .string()
    .trim()
    .min(2, "O endereço da clínica deve ter pelo menos 2 caracteres.")
    .max(60, "O endereço da clínica deve ter no máximo 60 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens simples.",
    ),
});

export type ClinicInput = z.infer<typeof clinicInputSchema>;

export const slugAvailabilitySchema = z.object({
  available: z.boolean(),
  slug: z.string(),
});

export type SlugAvailability = z.infer<typeof slugAvailabilitySchema>;

export const organizationCreatedSchema = z.object({
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    role: z.enum(["ADMIN", "PROFESSIONAL", "RECEPTIONIST"]),
    isOwner: z.boolean(),
  }),
});

export type OrganizationCreated = z.infer<typeof organizationCreatedSchema>;
