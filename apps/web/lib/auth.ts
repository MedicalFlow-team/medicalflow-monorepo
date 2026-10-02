export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  role: "ADMIN" | "PROFESSIONAL" | "RECEPTIONIST";
  isOwner: boolean;
};

export type LoginResult = {
  user: { id: string; email: string; fullName: string };
  availableOrganizations: OrganizationSummary[];
  onboardingCompleted: boolean;
};

export type ApiFailure = {
  error?: { code?: string; message?: string };
};

export function safeReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://medicalflow.local");
    if (url.origin !== "https://medicalflow.local") return null;
    if (
      url.pathname === "/app" ||
      url.pathname.startsWith("/app/") ||
      url.pathname.startsWith("/onboarding/") ||
      url.pathname === "/select-organization"
    ) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function destinationAfterLogin(
  result: LoginResult,
  returnTo: string | null,
): string {
  const safeReturnTo = safeReturnPath(returnTo);
  if (safeReturnTo) return safeReturnTo;
  if (!result.onboardingCompleted) return "/onboarding/profile";
  if (result.availableOrganizations.length === 1) {
    return `/app/${encodeURIComponent(result.availableOrganizations[0].slug)}/dashboard`;
  }
  return "/select-organization";
}

export async function submitAuth<T>(
  action: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await fetch(`/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const failure = result as ApiFailure;
    const error = new Error(
      failure.error?.message ?? "Não foi possível concluir a solicitação.",
    );
    error.name = failure.error?.code ?? "REQUEST_FAILED";
    throw error;
  }
  return result as T;
}
