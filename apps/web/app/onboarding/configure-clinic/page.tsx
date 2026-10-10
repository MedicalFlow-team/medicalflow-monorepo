import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfigureClinicForm } from "@/components/flowcare/configure-clinic-form";
import { OnboardingStepper } from "@/components/flowcare/onboarding-stepper";
import { onboardingStepPath } from "@/lib/onboarding-steps";
import { clinicDetailsRequest } from "@/server/clinic-details";
import { getOnboardingProgress } from "@/server/onboarding";
import { getAvailableOrganizations } from "@/server/organizations";

export const metadata: Metadata = { title: "Configurar clínica | Flowcare" };

export default async function ConfigureClinicPage() {
  const progress = await getOnboardingProgress();
  if (!progress) redirect("/login");
  if (progress.completed) redirect("/app");
  if (
    progress.currentStep === "PROFILE_SETUP" ||
    progress.currentStep === "ORGANIZATION_SETUP"
  )
    redirect(onboardingStepPath(progress.currentStep));
  if (progress.currentStep !== "CLINIC_DETAILS" && !progress.completed)
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
          <OnboardingStepper currentStep="CLINIC_DETAILS" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Configure sua clínica
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Informe os dados usados no sistema e nos documentos.
        </p>
        {details ? (
          <ConfigureClinicForm initial={details} />
        ) : (
          <p role="alert" className="mt-8 text-destructive">
            Não foi possível carregar os dados da clínica. Recarregue a página.
          </p>
        )}
      </div>
    </main>
  );
}
