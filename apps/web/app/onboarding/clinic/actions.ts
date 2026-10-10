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
  input: Pick<ClinicInput, "name"> & Partial<Pick<ClinicInput, "slug">>,
): Promise<ActionResult<OrganizationCreated>> {
  const autoGenerateSlug = !input.slug;
  const baseSlug = autoGenerateSlug
    ? slugify(input.name).slice(0, 60).replace(/-+$/g, "") || "clinica"
    : slugify(input.slug ?? "");
  const validated = clinicInputSchema.safeParse({
    name: input.name,
    slug: baseSlug,
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

  for (let attempt = 0; attempt < 4; attempt++) {
    const suffix = attempt === 0 ? "" : `-${crypto.randomUUID().slice(0, 8)}`;
    const slug = suffix
      ? `${baseSlug.slice(0, 60 - suffix.length).replace(/-+$/g, "")}${suffix}`
      : baseSlug;
    try {
      const result = await createOrganizationRequest({
        ...validated.data,
        slug,
      });
      return { ok: true, data: result };
    } catch (error) {
      if (
        autoGenerateSlug &&
        attempt < 3 &&
        error instanceof ClinicApiError &&
        error.code === "ALREADY_EXISTS"
      ) {
        continue;
      }
      const code = error instanceof ClinicApiError ? error.code : "UNAVAILABLE";
      const message =
        error instanceof ClinicApiError
          ? error.message
          : "Não foi possível criar a clínica. Tente novamente.";
      return { ok: false, error: { code, message } };
    }
  }

  return {
    ok: false,
    error: {
      code: "UNAVAILABLE",
      message: "Não foi possível criar a clínica.",
    },
  };
}
