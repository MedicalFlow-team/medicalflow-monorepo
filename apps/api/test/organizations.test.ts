import { expect, test } from "bun:test";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";
import type { PrismaClient } from "../src/generated/prisma/client";
import { OrganizationsService } from "../src/modules/organizations/service";
import { signSessionToken } from "../src/services/session-token";

test("lists only active memberships for the authenticated user", async () => {
  let query: unknown;
  const prisma = {
    membership: {
      findMany: async (args: unknown) => {
        query = args;
        return [
          {
            role: "ADMIN",
            organization: { id: "org-1", name: "Pet Saúde", slug: "pet-saude" },
          },
        ];
      },
    },
  } as unknown as PrismaClient;
  const result = await new OrganizationsService(prisma).listForUser("user-1");
  expect(query).toMatchObject({
    where: { userId: "user-1", status: "ACTIVE" },
  });
  expect(result.data[0]).toMatchObject({ slug: "pet-saude", role: "ADMIN" });
});

const contact = {
  version: 0,
  legalName: "Pet Saúde Ltda",
  taxId: "",
  contactEmail: "contato@pet.com",
  contactPhone: "85999999999",
};
const address = {
  version: 1,
  postalCode: "60000000",
  state: "CE",
  city: "Fortaleza",
  district: "Centro",
  street: "Rua das Flores",
  streetNumber: "10",
  addressComplement: "",
};

test("clinic steps deny users without an active admin membership", async () => {
  let membershipQuery: unknown;
  const prisma = {
    membership: {
      findFirst: async (query: unknown) => {
        membershipQuery = query;
        return null;
      },
    },
  } as unknown as PrismaClient;
  const service = new OrganizationsService(prisma);
  await expect(
    service.getClinicDetails("other-user", "pet-saude"),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    service.saveClinicContact("other-user", "pet-saude", contact),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    service.saveClinicAddress("other-user", "pet-saude", address),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(membershipQuery).toMatchObject({
    where: {
      userId: "other-user",
      status: "ACTIVE",
      role: "ADMIN",
      organization: { slug: "pet-saude" },
    },
  });
});

test("contact and address save separately and advance onboarding", async () => {
  const org = {
    id: "org-1",
    name: "Pet Saúde",
    slug: "pet-saude",
    detailsVersion: 0,
    detailsCompletedAt: null as Date | null,
  };
  const progress = {
    currentStep: "ORGANIZATION_SETUP",
    completed: true,
    draftData: { organizationId: "org-1" },
  };
  const writes: Array<{
    where: { detailsVersion: number };
    data: Record<string, unknown>;
  }> = [];
  const prisma = {
    membership: { findFirst: async () => ({ organization: org }) },
    onboardingProgress: { findUnique: async () => progress },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        membership: { findFirst: async () => ({ id: "membership-1" }) },
        onboardingProgress: {
          findUnique: async () => progress,
          update: async ({
            data,
          }: {
            data: { currentStep: string; completed: boolean };
          }) => {
            progress.currentStep = data.currentStep;
            progress.completed = data.completed;
          },
        },
        organization: {
          updateMany: async (args: {
            where: { detailsVersion: number };
            data: Record<string, unknown>;
          }) => {
            writes.push(args);
            org.detailsVersion++;
            if (args.data.detailsCompletedAt)
              org.detailsCompletedAt = args.data.detailsCompletedAt as Date;
            return { count: 1 };
          },
        },
      }),
  } as unknown as PrismaClient;
  const service = new OrganizationsService(prisma);
  await service.saveClinicContact("user-1", "pet-saude", contact);
  expect(writes[0]).toMatchObject({
    where: { detailsVersion: 0 },
    data: { legalName: "Pet Saúde Ltda" },
  });
  expect(writes[0]?.data.postalCode).toBeUndefined();
  expect(progress).toMatchObject({
    currentStep: "CLINIC_DETAILS",
    completed: true,
  });
  expect(org.detailsCompletedAt).toBeNull();
  await service.saveClinicAddress("user-1", "pet-saude", address);
  expect(writes[1]).toMatchObject({
    where: { detailsVersion: 1 },
    data: { city: "Fortaleza" },
  });
  expect(writes[1]?.data.legalName).toBeUndefined();
  expect(progress).toMatchObject({
    currentStep: "CLINIC_ADDRESS",
    completed: true,
  });
  expect(org.detailsCompletedAt).toBeInstanceOf(Date);
  await expect(
    service.saveClinicContact("user-1", "pet-saude", contact),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await expect(
    service.saveClinicAddress("user-1", "pet-saude", address),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  await expect(
    service.saveClinicContact("user-1", "pet-saude", {
      ...contact,
      version: 2,
    }),
  ).rejects.toMatchObject({ code: "STEP_ALREADY_COMPLETED" });
});

test("clinic steps reject stale versions and another onboarding organization", async () => {
  const org = { id: "org-1", detailsVersion: 1 };
  const progress = {
    currentStep: "ORGANIZATION_SETUP",
    completed: true,
    draftData: { organizationId: "org-1" },
  };
  const prisma = {
    membership: { findFirst: async () => ({ organization: org }) },
    onboardingProgress: { findUnique: async () => progress },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        membership: { findFirst: async () => ({ id: "membership-1" }) },
        onboardingProgress: { findUnique: async () => progress },
        organization: { updateMany: async () => ({ count: 0 }) },
      }),
  } as unknown as PrismaClient;
  const service = new OrganizationsService(prisma);
  await expect(
    service.saveClinicContact("user-1", "pet-saude", contact),
  ).rejects.toMatchObject({ code: "VERSION_CONFLICT", httpStatus: 409 });
  org.id = "org-2";
  await expect(
    service.saveClinicContact("user-1", "pet-saude", contact),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("clinic validation names the invalid field before any write", async () => {
  let writes = 0;
  const org = { id: "org-1", detailsVersion: 0 };
  const progress = {
    currentStep: "ORGANIZATION_SETUP",
    completed: true,
    draftData: { organizationId: "org-1" },
  };
  const prisma = {
    membership: { findFirst: async () => ({ organization: org }) },
    onboardingProgress: { findUnique: async () => progress },
    $transaction: async () => {
      writes++;
    },
  } as unknown as PrismaClient;
  const service = new OrganizationsService(prisma);
  await expect(
    service.saveClinicContact("user-1", "pet-saude", {
      ...contact,
      taxId: "11.111.111/1111-11",
    }),
  ).rejects.toMatchObject({
    code: "VALIDATION_ERROR",
    details: { field: "taxId" },
  });
  progress.currentStep = "CLINIC_DETAILS";
  org.detailsVersion = 1;
  await expect(
    service.saveClinicAddress("user-1", "pet-saude", {
      ...address,
      city: "  ",
    }),
  ).rejects.toMatchObject({
    code: "VALIDATION_ERROR",
    details: { field: "city" },
  });
  expect(writes).toBe(0);
});

test("clinic HTTP validation identifies a field without echoing its value", async () => {
  const secret = "clinic-test-secret";
  const env = {
    jwtSecret: secret,
    corsOrigin: "http://localhost:3000",
    wahaBaseUrl: "http://127.0.0.1:1",
    version: "test",
    webAppUrl: "http://localhost:3000",
  } as Env;
  const prisma = {
    session: {
      findFirst: async () => ({ id: "session-1", lastActiveAt: new Date() }),
    },
    membership: {
      findFirst: async () => ({
        organization: { id: "org-1", detailsVersion: 0 },
      }),
    },
    onboardingProgress: {
      findUnique: async () => ({
        currentStep: "ORGANIZATION_SETUP",
        completed: true,
        draftData: { organizationId: "org-1" },
      }),
    },
  } as unknown as PrismaClient;
  const app = createApp(env, { prisma, mailer: {} as never });
  const token = signSessionToken(
    { sid: "session-1", sub: "user-1" },
    secret,
    3600,
  );
  const response = await app.handle(
    new Request(
      "http://localhost/api/organizations/pet-saude/onboarding-contact",
      {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...contact, contactEmail: "not-an-email" }),
      },
    ),
  );
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body).toMatchObject({
    error: { code: "VALIDATION_ERROR", details: { field: "contactEmail" } },
  });
  expect(JSON.stringify(body)).not.toContain("not-an-email");
});
