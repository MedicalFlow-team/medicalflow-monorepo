import "server-only";

import { z } from "zod";
import { getServerConfig } from "./config";
import { getSessionToken } from "./session";

const organizationsResponse = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      role: z.enum(["ADMIN", "PROFESSIONAL", "RECEPTIONIST"]),
    }),
  ),
});

export type OrganizationSummary = z.infer<
  typeof organizationsResponse
>["data"][number];

export async function getAvailableOrganizations(): Promise<
  OrganizationSummary[] | null
> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(`${apiBaseUrl}/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const parsed = organizationsResponse.safeParse(await response.json());
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}
