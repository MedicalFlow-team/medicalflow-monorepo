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

const steps = ["Perfil", "Clínica"];

export function OnboardingStepper({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <Stepper
      role="group"
      value={currentStep}
      indicators={{ completed: <CheckIcon className="size-3.5" /> }}
    >
      <StepperNav aria-label="Etapas do primeiro acesso">
        {steps.map((title, index) => (
          <StepperItem
            key={title}
            step={index + 1}
            className="relative flex-1 items-start"
          >
            <div className="flex flex-col items-center gap-2.5">
              <StepperIndicator>{index + 1}</StepperIndicator>
              <StepperTitle>{title}</StepperTitle>
            </div>
            {index < steps.length - 1 && (
              <StepperSeparator className="absolute inset-x-0 top-3 left-[calc(50%+0.875rem)] m-0 w-[calc(100%-2rem+0.225rem)] flex-none bg-border" />
            )}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
