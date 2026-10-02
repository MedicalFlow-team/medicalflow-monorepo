import "server-only";

import { z } from "zod";
import { getServerConfig } from "./config";

const publicMessages = {
  INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
  ACCOUNT_NOT_VERIFIED: "Confirme seu e-mail antes de entrar.",
  INVALID_TOKEN: "Este link é inválido, expirou ou já foi usado.",
  VALIDATION_ERROR: "Confira os dados informados e tente novamente.",
  RATE_LIMITED: "Aguarde antes de tentar novamente.",
  UPSTREAM_UNAVAILABLE: "Serviço indisponível. Tente novamente.",
} as const;

type ErrorCode = keyof typeof publicMessages;

export class ApiRequestError extends Error {
  constructor(readonly code: ErrorCode) {
    super(publicMessages[code]);
  }
}

const failureSchema = z.object({ error: z.object({ code: z.string() }) });

export async function postApi<T>(
  path: string,
  body: Record<string, string>,
  responseSchema: z.ZodType<T>,
): Promise<T> {
  try {
    const { apiBaseUrl } = getServerConfig();
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const failure = failureSchema.safeParse(data);
      const code = failure.success ? failure.data.error.code : "";
      if (Object.hasOwn(publicMessages, code)) {
        throw new ApiRequestError(code as ErrorCode);
      }
      throw new ApiRequestError("UPSTREAM_UNAVAILABLE");
    }
    const parsed = responseSchema.safeParse(data);
    if (!parsed.success) throw new ApiRequestError("UPSTREAM_UNAVAILABLE");
    return parsed.data;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError("UPSTREAM_UNAVAILABLE");
  }
}
