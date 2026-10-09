import "server-only";

import {
  type ClinicInput,
  type OrganizationCreated,
  organizationCreatedSchema,
  type SlugAvailability,
  slugAvailabilitySchema,
} from "@/lib/onboarding-clinic";
import { getServerConfig } from "./config";
import { getSessionToken } from "./session";

export class ClinicApiError extends Error {
  constructor(
    readonly code:
      | "UNAUTHENTICATED"
      | "VALIDATION_ERROR"
      | "ALREADY_EXISTS"
      | "UNAVAILABLE",
    message?: string,
  ) {
    super(
      message ??
        (code === "UNAUTHENTICATED"
          ? "Sua sessão expirou. Entre novamente."
          : code === "ALREADY_EXISTS"
            ? "Este endereço já está em uso. Escolha outro."
            : code === "VALIDATION_ERROR"
              ? "Confira os dados informados."
              : "Não foi possível criar a clínica. Tente novamente."),
    );
  }
}

export async function checkSlugAvailabilityRequest(
  slug: string,
): Promise<SlugAvailability> {
  const token = await getSessionToken();
  if (!token) throw new ClinicApiError("UNAUTHENTICATED");
  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(
      `${apiBaseUrl}/onboarding/check-slug?slug=${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 401) throw new ClinicApiError("UNAUTHENTICATED");
    if (!response.ok) throw new ClinicApiError("UNAVAILABLE");
    const data: unknown = await response.json();
    const parsed = slugAvailabilitySchema.safeParse(data);
    if (!parsed.success) throw new ClinicApiError("UNAVAILABLE");
    return parsed.data;
  } catch (error) {
    if (error instanceof ClinicApiError) throw error;
    throw new ClinicApiError("UNAVAILABLE");
  }
}

export async function createOrganizationRequest(
  input: ClinicInput,
): Promise<OrganizationCreated> {
  const token = await getSessionToken();
  if (!token) throw new ClinicApiError("UNAUTHENTICATED");
  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(`${apiBaseUrl}/onboarding/organization`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: input.name, slug: input.slug }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) throw new ClinicApiError("UNAUTHENTICATED");
    if (response.status === 409) throw new ClinicApiError("ALREADY_EXISTS");
    if (response.status === 400) throw new ClinicApiError("VALIDATION_ERROR");
    if (!response.ok) throw new ClinicApiError("UNAVAILABLE");
    const data: unknown = await response.json();
    const parsed = organizationCreatedSchema.safeParse(data);
    if (!parsed.success) throw new ClinicApiError("UNAVAILABLE");
    return parsed.data;
  } catch (error) {
    if (error instanceof ClinicApiError) throw error;
    throw new ClinicApiError("UNAVAILABLE");
  }
}
