import { redirect } from "next/navigation";
import { getOnboardingProgress } from "@/server/onboarding";
import { getSessionToken } from "@/server/session";

export default async function Home() {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const progress = await getOnboardingProgress();
  if (!progress) {
    redirect("/login");
  }

  if (!progress.completed) {
    if (progress.currentStep === "ORGANIZATION_SETUP") {
      redirect("/onboarding/clinic");
    }
    redirect("/onboarding/profile");
  }

  redirect("/app");
}
