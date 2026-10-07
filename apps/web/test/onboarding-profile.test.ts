import { expect, test } from "bun:test";
import { profileDraftInput, profileInput } from "../lib/onboarding-profile";

const base = {
  fullName: "Ana Oliveira",
  phone: "(85) 99999-0000",
  professionalRole: "MANAGEMENT" as const,
  professionalTitle: "",
  registrationNumber: "",
};

test("perfil administrativo exige nome e telefone, sem registro clínico", () => {
  expect(profileInput.safeParse(base).success).toBe(true);
  expect(profileInput.safeParse({ ...base, fullName: "A" }).success).toBe(
    false,
  );
  expect(profileInput.safeParse({ ...base, phone: "85" }).success).toBe(false);
});

test("profissional clínico precisa de profissão e registro", () => {
  const clinical = { ...base, professionalRole: "CLINICAL" as const };
  const result = profileInput.safeParse(clinical);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual([
      "professionalTitle",
      "registrationNumber",
    ]);
  }
  expect(
    profileInput.safeParse({
      ...clinical,
      professionalTitle: "Médica",
      registrationNumber: "CRM/CE 123456",
    }).success,
  ).toBe(true);
});

test("rascunho permite campos incompletos sem concluir o perfil", () => {
  expect(
    profileDraftInput.safeParse({ ...base, fullName: "", phone: "85" }).success,
  ).toBe(true);
  expect(
    profileDraftInput.safeParse({ ...base, phone: "1".repeat(21) }).success,
  ).toBe(false);
});
