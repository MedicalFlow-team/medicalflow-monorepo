import { expect, test } from "bun:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { OnboardingService } from "../src/modules/onboarding/service";
import { resolveOnboardingState } from "../src/modules/onboarding/steps";

const steps = ["PROFILE_SETUP", "ORGANIZATION_SETUP", "SCHEDULE_SETUP"];

test("routes a new account to the profile", () => {
  expect(
    resolveOnboardingState(
      { profileCompleted: false, hasOrganization: false, savedProgress: null },
      steps,
    ),
  ).toEqual({ currentStep: "PROFILE_SETUP", completed: false });
});

test("routes a completed profile to clinic creation", () => {
  expect(
    resolveOnboardingState(
      { profileCompleted: true, hasOrganization: false, savedProgress: null },
      steps,
    ),
  ).toEqual({ currentStep: "ORGANIZATION_SETUP", completed: false });
});

test("does not send invited members without owner onboarding progress back to setup", () => {
  expect(
    resolveOnboardingState({
      profileCompleted: false,
      hasOrganization: true,
      savedProgress: null,
    }),
  ).toEqual({ currentStep: "ORGANIZATION_SETUP", completed: true });
});

test("reopens onboarding for a newly registered step after clinic creation", () => {
  expect(
    resolveOnboardingState(
      {
        profileCompleted: true,
        hasOrganization: true,
        savedProgress: { currentStep: "ORGANIZATION_SETUP", completed: true },
      },
      steps,
    ),
  ).toEqual({ currentStep: "SCHEDULE_SETUP", completed: false });
});

test("keeps the next unfinished step and completes after the last one", () => {
  const input = { profileCompleted: true, hasOrganization: true };
  expect(
    resolveOnboardingState(
      {
        ...input,
        savedProgress: { currentStep: "SCHEDULE_SETUP", completed: false },
      },
      steps,
    ),
  ).toEqual({ currentStep: "SCHEDULE_SETUP", completed: false });
  expect(
    resolveOnboardingState(
      {
        ...input,
        savedProgress: { currentStep: "SCHEDULE_SETUP", completed: true },
      },
      steps,
    ),
  ).toEqual({ currentStep: "SCHEDULE_SETUP", completed: true });
});

test("does not bypass an unrecognized pending stage", () => {
  expect(
    resolveOnboardingState({
      profileCompleted: true,
      hasOrganization: true,
      savedProgress: { currentStep: "NEW_SETUP", completed: false },
    }),
  ).toEqual({ currentStep: "NEW_SETUP", completed: false });
});

test("editing the profile preserves progress in a later stage", async () => {
  let savedStep: string | undefined;
  const prisma = {
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
      operation({
        user: { update: async () => ({}) },
        onboardingProgress: {
          findUnique: async () => ({ currentStep: "SCHEDULE_SETUP" }),
          upsert: async ({ update }: { update: { currentStep: string } }) => {
            savedStep = update.currentStep;
          },
        },
      }),
    user: {
      findUnique: async () => ({
        fullName: "Ana Silva",
        phone: "85999999999",
        professionalRole: "MANAGEMENT",
        professionalTitle: null,
        registrationNumber: null,
        profileCompletedAt: new Date(),
        onboarding: { draftData: {} },
      }),
    },
  } as unknown as PrismaClient;

  await new OnboardingService({ prisma }).saveProfile("user-1", {
    fullName: "Ana Silva",
    phone: "85999999999",
    professionalRole: "MANAGEMENT",
  });

  expect(savedStep).toBe("SCHEDULE_SETUP");
});
