import { Elysia } from "elysia";

/**
 * Logs estruturados: uma linha JSON por request, sem dependências —
 * consumível via `docker service logs medflow_api` ou qualquer collector.
 *
 * `/api/health` fica fora do log: o healthcheck do Docker polla a cada 30s
 * e viraria ruído (2.880 linhas/dia sem informação).
 */
const startedAt = new WeakMap<Request, number>();

function log(
  level: "info" | "error",
  msg: string,
  data: Record<string, unknown>,
) {
  console.log(
    JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data }),
  );
}

export const requestLogger = new Elysia({ name: "request-logger" })
  .onRequest(({ request }) => {
    startedAt.set(request, performance.now());
  })
  .onAfterResponse(({ request, set }) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return;

    const start = startedAt.get(request);
    const status = typeof set.status === "number" ? set.status : 200;
    log(status >= 500 ? "error" : "info", "http_request", {
      method: request.method,
      path: url.pathname,
      status,
      ms: start === undefined ? -1 : Math.round(performance.now() - start),
    });
  });
