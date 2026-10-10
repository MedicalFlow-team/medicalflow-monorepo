export const onboardingSteps = [
  { id: "PROFILE_SETUP", title: "Perfil", path: "/onboarding/profile" },
  { id: "ORGANIZATION_SETUP", title: "Clínica", path: "/onboarding/clinic" },
] as const;

export function onboardingStepPath(currentStep: string): string {
  return (
    onboardingSteps.find((step) => step.id === currentStep)?.path ??
    "/onboarding/pending"
  );
}
