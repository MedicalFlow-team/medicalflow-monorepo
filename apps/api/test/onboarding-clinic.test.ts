import { describe, expect, test } from "bun:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { OnboardingService } from "../src/modules/onboarding/service";

describe("Onboarding Clinic (Issue #221)", () => {
  test("checkSlugAvailability normaliza o slug e retorna disponível quando não existe", async () => {
    const prisma = {
      organization: {
        findUnique: async ({ where }: { where: { slug: string } }) => {
          if (where.slug === "clinica-vida-saude") return null;
          return null;
        },
      },
    } as unknown as PrismaClient;

    const service = new OnboardingService({ prisma });
    const result = await service.checkSlugAvailability("Clínica Vida & Saúde");
    expect(result.available).toBe(true);
    expect(result.slug).toBe("clinica-vida-saude");
  });

  test("checkSlugAvailability retorna indisponível quando slug já existe", async () => {
    const prisma = {
      organization: {
        findUnique: async ({ where }: { where: { slug: string } }) => {
          if (where.slug === "clinica-existente") {
            return { id: "org-1" };
          }
          return null;
        },
      },
    } as unknown as PrismaClient;

    const service = new OnboardingService({ prisma });
    const result = await service.checkSlugAvailability("clinica-existente");
    expect(result.available).toBe(false);
    expect(result.slug).toBe("clinica-existente");
  });

  test("checkSlugAvailability retorna indisponível para entrada inválida sem caracteres", async () => {
    const prisma = {
      organization: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;

    const service = new OnboardingService({ prisma });
    const result = await service.checkSlugAvailability("---!@#$---");
    expect(result.available).toBe(false);
    expect(result.slug).toBe("");
  });

  test("createOrganization cria clínica com vínculo ADMIN e assinatura na mesma transação", async () => {
    let createdOrg: any = null;
    let createdMembership: any = null;
    let createdSubscription: any = null;

    const prisma = {
      user: {
        findUnique: async () => ({ id: "user-123" }),
      },
      organization: {
        findUnique: async () => null,
      },
      $transaction: async (fn: (tx: any) => Promise<any>) => {
        return fn({
          organization: {
            create: async ({ data }: any) => {
              createdOrg = data;
              return { id: "org-123", ...data };
            },
          },
          membership: {
            create: async ({ data }: any) => {
              createdMembership = data;
              return { id: "mem-123", ...data };
            },
          },
          subscription: {
            create: async ({ data }: any) => {
              createdSubscription = data;
              return { id: "sub-123", ...data };
            },
          },
          onboardingProgress: {
            upsert: async () => ({ id: "prog-1" }),
          },
        });
      },
    } as unknown as PrismaClient;

    const service = new OnboardingService({ prisma });
    const response = await service.createOrganization("user-123", {
      name: "Clínica Nova Esperança",
      slug: "nova-esperanca",
    });

    expect(response.organization.id).toBe("org-123");
    expect(response.organization.name).toBe("Clínica Nova Esperança");
    expect(response.organization.slug).toBe("nova-esperanca");
    expect(response.organization.role).toBe("ADMIN");
    expect(response.organization.isOwner).toBe(true);

    expect(createdOrg).toEqual({
      name: "Clínica Nova Esperança",
      slug: "nova-esperanca",
      ownerId: "user-123",
    });
    expect(createdMembership).toEqual({
      userId: "user-123",
      organizationId: "org-123",
      role: "ADMIN",
      status: "ACTIVE",
    });
    expect(createdSubscription).toEqual({
      organizationId: "org-123",
    });
  });
});
