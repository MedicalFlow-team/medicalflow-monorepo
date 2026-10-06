import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { createPrismaClient } from "./services/db";
import { createMailer } from "./services/mailer";

// Raiz de composição: monta env, infra e aplicação.
const env = loadEnv();
const prisma = createPrismaClient(env.databaseUrl);
const mailer = createMailer(env);

const app = createApp(env, { prisma, mailer }).listen(env.port);

// Log estruturado de boot — uma linha JSON, mesmo formato do request-logger
console.log(
  JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    msg: "boot",
    service: "flowcare-api",
    version: env.version,
    env: env.nodeEnv,
    port: app.server?.port ?? env.port,
  }),
);
