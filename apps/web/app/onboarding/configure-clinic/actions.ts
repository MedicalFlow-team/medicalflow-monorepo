"use server";

import {
  type ClinicDetailsInput,
  clinicAddressSchema,
  clinicContactSchema,
} from "@/lib/clinic-details";
import {
  ClinicDetailsApiError,
  clinicDetailsRequest,
} from "@/server/clinic-details";

async function saveStep(
  slug: string,
  input: ClinicDetailsInput,
  step: "CONTACT" | "ADDRESS",
) {
  const parsed = (
    step === "CONTACT" ? clinicContactSchema : clinicAddressSchema
  ).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Confira os campos destacados.",
    };
  }
  try {
    return {
      ok: true as const,
      data: await clinicDetailsRequest(step, slug, parsed.data),
    };
  } catch (error) {
    return {
      ok: false as const,
      code: error instanceof ClinicDetailsApiError ? error.code : "UNAVAILABLE",
      message:
        error instanceof Error ? error.message : "Não foi possível salvar.",
    };
  }
}

export async function saveClinicContact(
  slug: string,
  input: ClinicDetailsInput,
) {
  return saveStep(slug, input, "CONTACT");
}

export async function saveClinicAddress(
  slug: string,
  input: ClinicDetailsInput,
) {
  return saveStep(slug, input, "ADDRESS");
}
