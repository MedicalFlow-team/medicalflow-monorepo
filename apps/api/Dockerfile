# --- build: deps do workspace api (devDeps incluídos p/ prisma CLI) + generate ---
# Contexto de build = RAIZ do repo (bun.lock único do workspace vive lá).
FROM oven/bun:1.4-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
RUN bun install --frozen-lockfile --filter flowcare-api
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/
# src/generated é gitignored: o Prisma Client nasce aqui (Bun roda TS nativo).
RUN cd apps/api && bunx prisma generate

# --- runtime ---
# Bun executa TypeScript nativamente: sem bundle. Layout espelha o monorepo
# para a resolução de node_modules (raiz + workspace) funcionar igual ao dev.
FROM oven/bun:1.4-slim AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/src/generated ./src/generated
COPY apps/api/package.json ./
COPY apps/api/src ./src
COPY apps/api/prisma ./prisma
COPY apps/api/prisma.config.ts ./
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["bun", "src/index.ts"]
