import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * PrismaClient único da aplicação (driver adapter pg, Prisma 7).
 * Criado via factory para os testes poderem apontar para outro banco.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export type Prisma = PrismaClient;
