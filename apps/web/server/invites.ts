import "server-only";

import { z } from "zod";
import { type InviteDetails, inviteDetailsSchema } from "@/lib/invites";
import { getServerConfig } from "./config";
import { getSessionToken } from "./session";

export interface CurrentUserProfile {
  id: string;
  email: string;
  fullName: string;
}

const userProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  fullName: z.string(),
});

export async function getInviteDetails(
  token: string,
): Promise<InviteDetails | null> {
  if (!token || typeof token !== "string" || token.length < 20) {
    return null;
  }
  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(
      `${apiBaseUrl}/invites/${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const parsed = inviteDetailsSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUserProfile | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(`${apiBaseUrl}/me/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const parsed = userProfileSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function acceptInvite(
  token: string,
): Promise<{ organizationSlug: string }> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    throw new Error("UNAUTHENTICATED");
  }
  const { apiBaseUrl } = getServerConfig();
  const response = await fetch(
    `${apiBaseUrl}/invites/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    },
  );
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      data && typeof data === "object" && "error" in data
        ? (data as { error: { code?: string } }).error?.code
        : null;
    if (code === "FORBIDDEN") throw new Error("FORBIDDEN");
    if (code === "INVITE_EXPIRED" || response.status === 410) {
      throw new Error("INVITE_EXPIRED");
    }
    if (response.status === 401) throw new Error("UNAUTHENTICATED");
    throw new Error("UPSTREAM_UNAVAILABLE");
  }
  const parsed = z.object({ organizationSlug: z.string() }).safeParse(data);
  if (!parsed.success) throw new Error("UPSTREAM_UNAVAILABLE");
  return parsed.data;
}
