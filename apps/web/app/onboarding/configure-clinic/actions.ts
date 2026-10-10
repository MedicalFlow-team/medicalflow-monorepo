"use server";

import {
  type ClinicDetailsInput,
  clinicDetailsSchema,
} from "@/lib/clinic-details";
import {
  ClinicDetailsApiError,
  clinicDetailsRequest,
} from "@/server/clinic-details";

export async function saveClinicDetails(
  slug: string,
  input: ClinicDetailsInput,
) {
  const parsed = clinicDetailsSchema.safeParse(input);
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
      data: await clinicDetailsRequest("PUT", slug, parsed.data),
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
