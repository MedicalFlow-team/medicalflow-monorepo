import { expect, test } from "bun:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { OrganizationsService } from "../src/modules/organizations/service";

test("lists only active memberships for the authenticated user", async () => {
  let query: unknown;
  const prisma = {
    membership: {
      findMany: async (args: unknown) => {
        query = args;
        return [
          {
            role: "ADMIN",
            organization: {
              id: "org-1",
              name: "Pet Saúde",
              slug: "pet-saude",
            },
          },
        ];
      },
    },
  } as unknown as PrismaClient;

  const result = await new OrganizationsService(prisma).listForUser("user-1");

  expect(query).toMatchObject({
    where: { userId: "user-1", status: "ACTIVE" },
  });
  expect(result).toEqual({
    data: [
      {
        id: "org-1",
        name: "Pet Saúde",
        slug: "pet-saude",
        role: "ADMIN",
      },
    ],
  });
});

const details = {
  version: 0,
  legalName: "Pet Saúde Ltda",
  taxId: "",
  contactEmail: "contato@pet.com",
  contactPhone: "85999999999",
  postalCode: "60000000",
  state: "CE",
  city: "Fortaleza",
  district: "Centro",
  street: "Rua das Flores",
  streetNumber: "10",
  addressComplement: "",
};

test("clinic details deny users without an active admin membership", async () => {
  const prisma = {
    membership: { findFirst: async () => null },
  } as unknown as PrismaClient;
  const service = new OrganizationsService(prisma);
  expect(
    service.getClinicDetails("other-user", "pet-saude"),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(
    service.saveClinicDetails("other-user", "pet-saude", details),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("clinic details save uses version and completes onboarding atomically", async () => {
  let updateArgs: unknown;
  let progressArgs: unknown;
  const org: {
    id: string;
    name: string;
    slug: string;
    detailsVersion: number;
    detailsCompletedAt: Date | null;
  } = {
    id: "org-1",
    name: "Pet Saúde",
    slug: "pet-saude",
    detailsVersion: 0,
    detailsCompletedAt: null,
  };
  const prisma = {
    membership: { findFirst: async () => ({ organization: org }) },
    onboardingProgress: {
      findUnique: async () => ({
        currentStep: "ORGANIZATION_SETUP",
        draftData: { organizationId: "org-1" },
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        membership: { findFirst: async () => ({ id: "membership-1" }) },
        organization: {
          updateMany: async (args: unknown) => {
            updateArgs = args;
            org.detailsVersion = 1;
            org.detailsCompletedAt = new Date();
            return { count: 1 };
          },
        },
        onboardingProgress: {
          update: async (args: unknown) => {
            progressArgs = args;
          },
        },
      }),
  } as unknown as PrismaClient;
  const result = await new OrganizationsService(prisma).saveClinicDetails(
    "user-1",
    "pet-saude",
    details,
  );
  expect(updateArgs).toMatchObject({
    where: { id: "org-1", detailsVersion: 0 },
    data: {
      legalName: "Pet Saúde Ltda",
      postalCode: "60000000",
      city: "Fortaleza",
    },
  });
  expect(progressArgs).toMatchObject({
    data: { currentStep: "CLINIC_DETAILS", completed: true },
  });
  expect(result.completed).toBe(true);
});

test("clinic details reject stale versions and another onboarding organization", async () => {
  const org = {
    id: "org-1",
    name: "Pet Saúde",
    slug: "pet-saude",
    detailsVersion: 1,
    detailsCompletedAt: null,
  };
  const prisma = {
    membership: { findFirst: async () => ({ organization: org }) },
    onboardingProgress: {
      findUnique: async () => ({
        currentStep: "CLINIC_DETAILS",
        draftData: { organizationId: "org-1" },
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        membership: { findFirst: async () => ({ id: "membership-1" }) },
        organization: { updateMany: async () => ({ count: 0 }) },
      }),
  } as unknown as PrismaClient;
  const service = new OrganizationsService(prisma);
  expect(
    service.saveClinicDetails("user-1", "pet-saude", details),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  org.id = "org-2";
  expect(
    service.saveClinicDetails("user-1", "pet-saude", details),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
