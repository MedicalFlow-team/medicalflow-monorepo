import { createApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv();

const app = createApp(env).listen(env.port);

// Log estruturado de boot (INF-07) — uma linha JSON, mesmo formato do request-logger
console.log(
  JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "boot",
    service: "medflow-api",
    version: env.version,
    env: env.nodeEnv,
    port: app.server?.port ?? env.port,
  }),
);
