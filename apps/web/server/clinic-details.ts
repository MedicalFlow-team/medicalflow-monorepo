import "server-only";

import {
  type ClinicDetailsInput,
  clinicDetailsResponseSchema,
} from "@/lib/clinic-details";
import { getServerConfig } from "./config";
import { getSessionToken } from "./session";

export class ClinicDetailsApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function clinicDetailsRequest(
  method: "GET" | "PUT",
  slug: string,
  body?: ClinicDetailsInput,
) {
  const token = await getSessionToken();
  if (!token)
    throw new ClinicDetailsApiError(
      "UNAUTHENTICATED",
      "Entre novamente para continuar.",
    );
  const { apiBaseUrl } = getServerConfig();
  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl}/organizations/${encodeURIComponent(slug)}/onboarding-details`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw new ClinicDetailsApiError(
      "UNAVAILABLE",
      "Não foi possível acessar a clínica. Tente novamente.",
    );
  }
  if (!response.ok) {
    const code =
      response.status === 409
        ? "CONFLICT"
        : response.status === 404 || response.status === 403
          ? "NOT_FOUND"
          : response.status === 401
            ? "UNAUTHENTICATED"
            : response.status === 400
              ? "VALIDATION_ERROR"
              : "UNAVAILABLE";
    throw new ClinicDetailsApiError(
      code,
      code === "CONFLICT"
        ? "Os dados foram alterados em outra sessão. Recarregue a página."
        : code === "NOT_FOUND"
          ? "Você não tem acesso administrativo a esta clínica."
          : "Não foi possível salvar os dados da clínica.",
    );
  }
  const parsed = clinicDetailsResponseSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new ClinicDetailsApiError(
      "UNAVAILABLE",
      "Resposta inválida da clínica.",
    );
  return parsed.data;
}
