import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfigureClinicForm } from "@/components/flowcare/configure-clinic-form";
import { OnboardingLoadError } from "@/components/flowcare/onboarding-load-error";
import { OnboardingStepper } from "@/components/flowcare/onboarding-stepper";
import { onboardingStepPath } from "@/lib/onboarding-steps";
import { clinicDetailsRequest } from "@/server/clinic-details";
import { getOnboardingProgress } from "@/server/onboarding";
import { getAvailableOrganizations } from "@/server/organizations";

export const metadata: Metadata = { title: "Endereço da clínica | Flowcare" };

export default async function ClinicAddressPage() {
  const progress = await getOnboardingProgress();
  if (!progress) redirect("/login");
  if (progress.completed) redirect("/app");
  if (progress.currentStep !== "CLINIC_ADDRESS")
    redirect(onboardingStepPath(progress.currentStep));

  const organizations = await getAvailableOrganizations();
  const organizationId = progress.draftData.organizationId;
  const clinic = organizations?.find(
    (org) =>
      org.role === "ADMIN" &&
      (typeof organizationId !== "string" || org.id === organizationId),
  );
  if (!clinic) redirect("/onboarding/pending");
  let details = null;
  try {
    details = await clinicDetailsRequest("GET", clinic.slug);
  } catch {
    /* Show retry guidance below. */
  }
  return (
    <main className="flex flex-1 justify-center px-5 pt-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8">
          <OnboardingStepper currentStep="CLINIC_ADDRESS" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Endereço da clínica
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Informe o endereço usado no sistema e nos documentos.
        </p>
        {details ? (
          <ConfigureClinicForm initial={details} step="address" />
        ) : (
          <OnboardingLoadError message="Não foi possível carregar os dados da clínica. Recarregue a página." />
        )}
      </div>
    </main>
  );
}
