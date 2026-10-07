"use server";

import {
  type ProfileInput,
  profileDraftInput,
  profileInput,
} from "@/lib/onboarding-profile";
import {
  ProfileApiError,
  profileApiRequest,
} from "@/server/onboarding-profile";

export type ProfileActionResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
      fieldErrors?: Partial<Record<keyof ProfileInput, string>>;
    };

export async function saveOnboardingProfile(
  input: ProfileInput,
): Promise<ProfileActionResult> {
  const validated = profileInput.safeParse(input);
  if (!validated.success) {
    const fieldErrors: Partial<Record<keyof ProfileInput, string>> = {};
    for (const issue of validated.error.issues) {
      const field = issue.path[0] as keyof ProfileInput | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return {
      ok: false,
      message: "Confira os campos indicados.",
      fieldErrors,
    };
  }

  try {
    await profileApiRequest("POST", {
      fullName: validated.data.fullName,
      phone: validated.data.phone,
      professionalRole: validated.data.professionalRole,
      professionalTitle: validated.data.professionalTitle,
      registrationNumber: validated.data.registrationNumber,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ProfileApiError
          ? error.message
          : "Não foi possível salvar seu perfil. Tente novamente.",
    };
  }
}

export async function saveOnboardingProfileDraft(
  input: ProfileInput,
): Promise<ProfileActionResult> {
  const validated = profileDraftInput.safeParse(input);
  if (!validated.success) {
    return { ok: false, message: "Rascunho contém dados inválidos." };
  }
  try {
    await profileApiRequest("PATCH", validated.data);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ProfileApiError
          ? error.message
          : "Não foi possível salvar o rascunho. Tente novamente.",
    };
  }
}
