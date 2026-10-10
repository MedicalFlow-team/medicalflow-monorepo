import { z } from "zod";

export function validCnpj(input: string) {
  const value = input.replace(/\D/g, "");
  if (!value) return true;
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  const digit = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder =
      weights.reduce(
        (sum, weight, index) => sum + Number(value[index]) * weight,
        0,
      ) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return Number(value[12]) === digit(12) && Number(value[13]) === digit(13);
}

export const clinicDetailsSchema = z.object({
  version: z.number().int().min(0),
  legalName: z.string().trim().min(2, "Informe a razão social.").max(160),
  taxId: z.string().refine(validCnpj, "Informe um CNPJ válido."),
  contactEmail: z.email("Informe um e-mail válido."),
  contactPhone: z.string().refine((v) => {
    const n = v.replace(/\D/g, "").length;
    return n >= 10 && n <= 11;
  }, "Informe um telefone com DDD."),
  postalCode: z.string().regex(/^\d{8}$/, "Informe um CEP com 8 dígitos."),
  state: z.string().regex(/^[A-Za-z]{2}$/, "Informe a sigla do estado."),
  city: z.string().trim().min(2, "Informe a cidade.").max(100),
  district: z.string().trim().min(2, "Informe o bairro.").max(100),
  street: z.string().trim().min(2, "Informe o logradouro.").max(160),
  streetNumber: z.string().trim().min(1, "Informe o número.").max(20),
  addressComplement: z.string().max(100),
});

export const clinicContactSchema = clinicDetailsSchema.pick({
  version: true,
  legalName: true,
  taxId: true,
  contactEmail: true,
  contactPhone: true,
});

export const clinicAddressSchema = clinicDetailsSchema.pick({
  version: true,
  postalCode: true,
  state: true,
  city: true,
  district: true,
  street: true,
  streetNumber: true,
  addressComplement: true,
});

export const clinicDetailsResponseSchema = z.object({
  name: z.string(),
  slug: z.string(),
  completed: z.boolean(),
  version: z.number().int().min(0),
  legalName: z.string(),
  taxId: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  postalCode: z.string(),
  state: z.string(),
  city: z.string(),
  district: z.string(),
  street: z.string(),
  streetNumber: z.string(),
  addressComplement: z.string(),
});

export type ClinicDetailsInput = z.infer<typeof clinicDetailsSchema>;
export type ClinicDetails = z.infer<typeof clinicDetailsResponseSchema>;
