import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClinicForm } from "@/components/flowcare/clinic-form";
import { OnboardingStepper } from "@/components/flowcare/onboarding-stepper";
import type { Profile } from "@/lib/onboarding-profile";
import {
  ProfileApiError,
  profileApiRequest,
} from "@/server/onboarding-profile";

export const metadata: Metadata = { title: "Criar clínica | Flowcare" };

export default async function OnboardingClinicPage() {
  let profile: Profile | null = null;
  let unauthenticated = false;

  try {
    profile = await profileApiRequest("GET", null);
  } catch (error) {
    unauthenticated =
      error instanceof ProfileApiError && error.code === "UNAUTHENTICATED";
  }

  if (unauthenticated) redirect("/login");
  if (profile && !profile.completed) redirect("/onboarding/profile");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-12 text-foreground">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8">
          <OnboardingStepper currentStep={2} />
        </div>
        <p className="mb-5 text-sm font-medium text-primary">
          Configuração da clínica
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dê um nome à sua clínica
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Defina o nome da sua clínica e o endereço que sua equipe usará para
          acessá-la no aplicativo.
        </p>
        <ClinicForm />
      </div>
    </main>
  );
}
