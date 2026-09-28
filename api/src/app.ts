import cors from "@elysiajs/cors";
import { Elysia, t } from "elysia";
import type { Env } from "./config/env";
import { requestLogger } from "./plugins/request-logger";

/**
 * Aplicação Elysia — montada via `createApp(env)` para manter o app
 * desacoplado do processo (testável sem rede/variáveis globais).
 *
 * Convenções do contrato (docs/CONTRATOS_API.md):
 * - §1: todo erro responde o envelope { error: { code, message } }
 * - §12: GET /health → { status, version, db, waha }
 * - Rotas de negócio entram por módulo em src/modules/<dominio> (BE-03+)
 */

const WAHA_PROBE_TIMEOUT_MS = 1500;

async function probeWaha(env: Env): Promise<"ok" | "down"> {
  try {
    const headers: Record<string, string> = {};
    if (env.wahaApiKey) headers["x-api-key"] = env.wahaApiKey;
    const res = await fetch(`${env.wahaBaseUrl}/ping`, {
      headers,
      signal: AbortSignal.timeout(WAHA_PROBE_TIMEOUT_MS),
    });
    return res.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

export function createApp(env: Env) {
  const app = new Elysia({ prefix: "/api" })
    .use(requestLogger)
    .use(
      cors({
        origin: env.corsOrigin.split(",").map((o) => o.trim()),
        // credenciais não são usadas: auth é via header Bearer (§0)
      }),
    )
    .get(
      "/health",
      async () => ({
        status: "ok",
        version: env.version,
        // db: conectado pelo BE-02/BE-03 (Prisma). Até lá, estado declarado.
        db: "pending" as const,
        waha: await probeWaha(env),
      }),
      {
        response: t.Object({
          status: t.String(),
          version: t.String(),
          db: t.String(),
          waha: t.Union([t.Literal("ok"), t.Literal("down")]),
        }),
      },
    )
    .onError(({ code, error, status }) => {
      // §1 do contrato — envelope { error: { code, message } }, stack nunca vaza
      switch (code) {
        case "NOT_FOUND":
          return status(404, {
            error: { code: "NOT_FOUND", message: "Recurso não encontrado." },
          });
        case "VALIDATION":
        case "PARSE":
          return status(400, {
            error: {
              code: "VALIDATION_ERROR",
              message:
                error instanceof Error ? error.message : "Dados inválidos.",
            },
          });
        default:
          return status(500, {
            error: {
              code: "INTERNAL",
              message: "Erro interno. Tente novamente.",
            },
          });
      }
    });

  return app;
}
