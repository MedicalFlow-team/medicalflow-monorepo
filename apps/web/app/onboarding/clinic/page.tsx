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

export default async function OnboardingClinicPage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string }>;
}) {
  const { review } = await searchParams;
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
    progress.currentStep !== "ORGANIZATION_SETUP" &&
    review !== "1"
  ) {
    redirect(onboardingStepPath(progress.currentStep));
  }
  const organizations =
    review === "1" ? await getAvailableOrganizations() : null;
  const clinic = organizations?.find(
    (org) =>
      org.role === "ADMIN" &&
      (typeof progress?.draftData.organizationId !== "string" ||
        org.id === progress.draftData.organizationId),
  );
  if (review === "1" && !clinic) redirect("/onboarding/pending");

  return (
    <main className="flex flex-1 justify-center px-5 pt-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8">
          <OnboardingStepper currentStep="ORGANIZATION_SETUP" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dê um nome à sua clínica
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Defina o nome da sua clínica para continuar.
        </p>
        {review === "1" && clinic ? (
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
