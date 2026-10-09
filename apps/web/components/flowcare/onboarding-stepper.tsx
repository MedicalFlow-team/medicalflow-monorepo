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
          <StepperItem key={title} step={index + 1}>
            <StepperIndicator>{index + 1}</StepperIndicator>
            <StepperTitle>{title}</StepperTitle>
            {index < steps.length - 1 && <StepperSeparator />}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  );
}
