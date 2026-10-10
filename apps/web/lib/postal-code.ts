import { z } from "zod";

const viaCepResponse = z.object({
  erro: z.boolean().optional(),
  uf: z.string().optional(),
  localidade: z.string().optional(),
  bairro: z.string().optional(),
  logradouro: z.string().optional(),
});

export function postalCodeDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function parsePostalCodeAddress(value: unknown) {
  const parsed = viaCepResponse.safeParse(value);
  if (!parsed.success || parsed.data.erro) return null;
  const { uf, localidade, bairro, logradouro } = parsed.data;
  if (!uf || !localidade) return null;
  return {
    state: uf,
    city: localidade,
    district: bairro ?? "",
    street: logradouro ?? "",
  };
}
