import { describe, expect, test } from "bun:test";
import type { PrismaClient } from "../src/generated/prisma/client";
import { OnboardingService } from "../src/modules/onboarding/service";

function fixture(
  options: {
    verified?: boolean;
    organizationId?: string | null;
    activeAdmin?: boolean;
  } = {},
) {
  let savedRules: unknown[] = [];
  let completed = false;
  let currentStep = "ORGANIZATION_SETUP";
  let version = 1;
  let writes = 0;
  const db = {
    user: {
      findUnique: async () => ({ emailVerified: options.verified ?? true }),
    },
    onboardingProgress: {
      findUnique: async () => ({
        draftData:
          options.organizationId === null
            ? {}
            : { organizationId: options.organizationId ?? "org-1" },
      }),
      updateMany: async () => {
        if (!completed || currentStep !== "CLINIC_ADDRESS") {
          completed = true;
          currentStep = "CLINIC_ADDRESS";
          version += 1;
          writes += 1;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    membership: {
      findFirst: async () =>
        options.activeAdmin === false
          ? null
          : { organization: { slug: "clinica-alfa" } },
    },
    weeklyScheduleRule: {
      deleteMany: async () => {
        savedRules = [];
      },
      createMany: async ({ data }: { data: unknown[] }) => {
        savedRules = data;
      },
    },
  };
  const prisma = {
    ...db,
    $transaction: async <T>(fn: (tx: typeof db) => Promise<T>) => fn(db),
  } as unknown as PrismaClient;
  return {
    service: new OnboardingService({ prisma }),
    rules: () => savedRules,
    writes: () => writes,
    version: () => version,
  };
}

describe("onboarding schedule and completion (#218)", () => {
  test("saves non-overlapping intervals and allows an empty schedule", async () => {
    const state = fixture();
    const monday = {
      dayOfWeek: "MONDAY" as const,
      startTime: "08:00",
      endTime: "12:00",
      slotDurationMinutes: 30,
    };
    const afternoon = { ...monday, startTime: "12:00", endTime: "18:00" };
    await state.service.saveScheduleRules("user-1", {
      weeklySchedule: [monday, afternoon],
    });
    expect(state.rules()).toHaveLength(2);
    await state.service.saveScheduleRules("user-1", { weeklySchedule: [] });
    expect(state.rules()).toHaveLength(0);
  });

  test("rejects overlaps, reversed intervals and oversized slots before writing", async () => {
    const state = fixture();
    const base = {
      dayOfWeek: "MONDAY" as const,
      startTime: "08:00",
      endTime: "12:00",
      slotDurationMinutes: 30,
    };
    for (const weeklySchedule of [
      [base, { ...base, startTime: "11:00", endTime: "13:00" }],
      [{ ...base, startTime: "18:00", endTime: "08:00" }],
      [{ ...base, slotDurationMinutes: 300 }],
    ]) {
      await expect(
        state.service.saveScheduleRules("user-1", { weeklySchedule }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR", httpStatus: 400 });
    }
    expect(state.rules()).toHaveLength(0);
  });

  test("completion is idempotent without schedule or invitations", async () => {
    const state = fixture();
    expect(await state.service.complete("user-1")).toEqual({
      redirectUrl: "/app/clinica-alfa/dashboard",
    });
    expect(await state.service.complete("user-1")).toEqual({
      redirectUrl: "/app/clinica-alfa/dashboard",
    });
    expect(state.writes()).toBe(1);
    expect(state.version()).toBe(2);
  });

  test("requires verified email, created clinic and active ADMIN membership", async () => {
    for (const options of [
      { verified: false },
      { organizationId: null },
      { activeAdmin: false },
    ]) {
      const state = fixture(options);
      await expect(state.service.complete("user-1")).rejects.toMatchObject({
        code:
          options.verified === false
            ? "ACCOUNT_NOT_VERIFIED"
            : "ONBOARDING_INCOMPLETE",
      });
      expect(state.writes()).toBe(0);
    }
  });
});
