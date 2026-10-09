"use server";

import type { ActionResult } from "@/lib/auth";
import {
  type ClinicInput,
  clinicInputSchema,
  type OrganizationCreated,
  type SlugAvailability,
  slugify,
} from "@/lib/onboarding-clinic";
import {
  ClinicApiError,
  checkSlugAvailabilityRequest,
  createOrganizationRequest,
} from "@/server/onboarding-clinic";

export async function checkSlugAction(
  rawSlug: string,
): Promise<ActionResult<SlugAvailability>> {
  const normalized = slugify(rawSlug);
  if (!normalized || normalized.length < 2) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "O endereço deve conter pelo menos 2 caracteres válidos.",
      },
    };
  }

  try {
    const result = await checkSlugAvailabilityRequest(normalized);
    return { ok: true, data: result };
  } catch (error) {
    const code = error instanceof ClinicApiError ? error.code : "UNAVAILABLE";
    const message =
      error instanceof ClinicApiError
        ? error.message
        : "Não foi possível verificar a disponibilidade do endereço.";
    return { ok: false, error: { code, message } };
  }
}

export async function createClinicAction(
  input: ClinicInput,
): Promise<ActionResult<OrganizationCreated>> {
  const validated = clinicInputSchema.safeParse({
    name: input.name,
    slug: slugify(input.slug || input.name),
  });

  if (!validated.success) {
    const firstIssue = validated.error.issues[0]?.message ?? "Dados inválidos.";
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstIssue,
      },
    };
  }

  try {
    const result = await createOrganizationRequest(validated.data);
    return { ok: true, data: result };
  } catch (error) {
    const code = error instanceof ClinicApiError ? error.code : "UNAVAILABLE";
    const message =
      error instanceof ClinicApiError
        ? error.message
        : "Não foi possível criar a clínica. Tente novamente.";
    return { ok: false, error: { code, message } };
  }
}
