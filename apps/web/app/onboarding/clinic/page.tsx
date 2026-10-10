import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClinicForm } from "@/components/flowcare/clinic-form";
import { OnboardingStepper } from "@/components/flowcare/onboarding-stepper";
import type { Profile } from "@/lib/onboarding-profile";
import { onboardingStepPath } from "@/lib/onboarding-steps";
import { getOnboardingProgress } from "@/server/onboarding";
import {
  ProfileApiError,
  profileApiRequest,
} from "@/server/onboarding-profile";
import { getAvailableOrganizations } from "@/server/organizations";

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
  const progress = await getOnboardingProgress();
  if (progress?.completed) redirect("/app");
  if (
    progress &&
    !["ORGANIZATION_SETUP", "CLINIC_DETAILS"].includes(progress.currentStep)
  ) {
    redirect(onboardingStepPath(progress.currentStep));
  }
  const clinicCreated = progress?.currentStep === "CLINIC_DETAILS";
  const organizations = clinicCreated
    ? await getAvailableOrganizations()
    : null;
  const clinic = organizations?.find(
    (org) =>
      org.role === "ADMIN" &&
      (typeof progress?.draftData.organizationId !== "string" ||
        org.id === progress.draftData.organizationId),
  );
  if (clinicCreated && !clinic) redirect("/onboarding/pending");

  return (
    <main className="flex flex-1 justify-center px-5 pt-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8">
          <OnboardingStepper
            currentStep="ORGANIZATION_SETUP"
            currentStepCompleted={clinicCreated}
          />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {clinicCreated ? "Clínica criada" : "Dê um nome à sua clínica"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {clinicCreated
            ? "O nome da clínica foi salvo. Continue para informar os dados institucionais."
            : "Defina o nome da sua clínica para continuar."}
        </p>
        {clinicCreated && clinic ? (
          <div className="mt-8 space-y-5">
            <p className="text-sm">{clinic.name}</p>
            <div className="flex justify-end">
              <Link
                href="/onboarding/configure-clinic"
                className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm text-primary-foreground"
              >
                Continuar
              </Link>
            </div>
          </div>
        ) : (
          <ClinicForm />
        )}
      </div>
    </main>
  );
}
