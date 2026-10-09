import { redirect } from "next/navigation";
import { onboardingStepPath } from "@/lib/onboarding-steps";
import { getOnboardingProgress } from "@/server/onboarding";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const progress = await getOnboardingProgress();
  if (!progress) redirect("/login");
  if (!progress.completed) redirect(onboardingStepPath(progress.currentStep));

  return children;
}
