"use client";

import { CheckIcon } from "lucide-react";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
} from "@/components/reui/stepper";
import { onboardingSteps } from "@/lib/onboarding-steps";

export function OnboardingStepper({
  currentStep,
  currentStepCompleted = false,
}: {
  currentStep: string;
  currentStepCompleted?: boolean;
}) {
  const activeStep =
    onboardingSteps.findIndex((step) => step.id === currentStep) + 1;
  return (
    <Stepper
      role="group"
      value={activeStep}
      indicators={{ completed: <CheckIcon className="size-3.5" /> }}
    >
      <StepperNav aria-label="Etapas do primeiro acesso">
        {onboardingSteps.map((step, index) => (
          <StepperItem
            key={step.id}
            step={index + 1}
            completed={currentStepCompleted && step.id === currentStep}
            className="relative flex-1 items-start"
          >
            <div className="flex flex-col items-center gap-2.5">
              <StepperIndicator>{index + 1}</StepperIndicator>
              <StepperTitle>{step.title}</StepperTitle>
            </div>
            {index < onboardingSteps.length - 1 && (
              <StepperSeparator className="absolute inset-x-0 top-3 left-[calc(50%+0.875rem)] m-0 w-[calc(100%-2rem+0.225rem)] flex-none bg-border" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
