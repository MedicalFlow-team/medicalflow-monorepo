import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/medicalflow/onboarding-flow";

export const metadata: Metadata = {
  title: "Configuração inicial | MedicalFlow",
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
