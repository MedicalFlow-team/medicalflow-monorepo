import "server-only";

import { type Profile, profileResponse } from "@/lib/onboarding-profile";
import { getServerConfig } from "./config";
import { getSessionToken } from "./session";

export class ProfileApiError extends Error {
  constructor(
    readonly code: "UNAUTHENTICATED" | "VALIDATION_ERROR" | "UNAVAILABLE",
  ) {
    super(
      code === "UNAUTHENTICATED"
        ? "Sua sessão expirou. Entre novamente."
        : code === "VALIDATION_ERROR"
          ? "Confira os dados informados."
          : "Não foi possível salvar seu perfil. Tente novamente.",
    );
  }
}

export async function profileApiRequest(
  method: "GET" | "POST" | "PATCH",
  body: Record<string, string> | null,
): Promise<Profile> {
  const token = await getSessionToken();
  if (!token) throw new ProfileApiError("UNAUTHENTICATED");
  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(`${apiBaseUrl}/onboarding/profile`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401) throw new ProfileApiError("UNAUTHENTICATED");
    if (response.status === 400) throw new ProfileApiError("VALIDATION_ERROR");
    if (!response.ok) throw new ProfileApiError("UNAVAILABLE");
    const parsed = profileResponse.safeParse(await response.json());
    if (!parsed.success) throw new ProfileApiError("UNAVAILABLE");
    return parsed.data;
  } catch (error) {
    if (error instanceof ProfileApiError) throw error;
    throw new ProfileApiError("UNAVAILABLE");
  }
}
