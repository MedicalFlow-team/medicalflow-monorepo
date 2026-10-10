import { redirect } from "next/navigation";
import { onboardingStepPath } from "@/lib/onboarding-steps";
import { getOnboardingProgress } from "@/server/onboarding";

export default async function PendingOnboardingStepPage() {
  const progress = await getOnboardingProgress();
  if (!progress) redirect("/login");
  if (progress.completed) redirect("/app");
  const path = onboardingStepPath(progress.currentStep);
  if (path !== "/onboarding/pending") redirect(path);

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-12">
      <h1 className="text-2xl font-semibold">Próxima etapa indisponível</h1>
      <p className="mt-3 text-muted-foreground">
        Não foi possível abrir a próxima etapa do seu cadastro. Tente novamente
        mais tarde.
      </p>
    </main>
  );
}
