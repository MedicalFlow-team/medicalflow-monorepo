import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingStepper } from "@/components/flowcare/onboarding-stepper";
import { ProfileForm } from "@/components/flowcare/profile-form";
import type { Profile } from "@/lib/onboarding-profile";
import {
  ProfileApiError,
  profileApiRequest,
} from "@/server/onboarding-profile";

export const metadata: Metadata = { title: "Complete seu perfil | Flowcare" };

export default async function OnboardingProfilePage() {
  let profile: Profile | null = null;
  let loadError = false;
  let unauthenticated = false;
  try {
    profile = await profileApiRequest("GET", null);
  } catch (error) {
    unauthenticated =
      error instanceof ProfileApiError && error.code === "UNAUTHENTICATED";
    loadError = true;
  }

  if (unauthenticated) redirect("/login");
  if (profile?.completed) redirect("/onboarding/clinic");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-12 text-foreground">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8">
          <OnboardingStepper currentStep={1} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Complete seu perfil
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Confira seus dados pessoais antes de configurar a clínica.
        </p>
        {loadError ? (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-destructive p-4"
          >
            Não foi possível carregar seu perfil. Recarregue a página para
            tentar novamente.
          </div>
        ) : profile ? (
          <ProfileForm initialProfile={profile} />
        ) : null}
      </div>
    </main>
  );
}
