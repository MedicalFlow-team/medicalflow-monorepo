"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const steps = ["Seu perfil", "Criar clínica", "Configurar", "Convidar equipe"];

type Invite = { email: string; role: string };

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [highestStep, setHighestStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [professionalRole, setProfessionalRole] = useState("management");
  const [state, setState] = useState("CE");
  const [invites, setInvites] = useState<Invite[]>([
    { email: "", role: "reception" },
    { email: "", role: "clinical" },
  ]);

  function goTo(step: number) {
    if (step > highestStep) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }

  function advance() {
    const next = Math.min(currentStep + 1, steps.length);
    setDirection(1);
    setHighestStep((value) => Math.max(value, next));
    setCurrentStep(next);
  }

  function back() {
    setDirection(-1);
    setCurrentStep((value) => Math.max(1, value - 1));
  }

  function unavailable() {
    toast.error(
      "Não foi possível concluir a solicitação. Tente novamente mais tarde.",
    );
  }

  return (
    <main className="min-h-svh bg-background px-5 pb-12 pt-2 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-[650px]">
        <AnimatePresence initial={false}>
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Image
                src="/logo-1.svg"
                alt="MedicalFlow"
                width={1900}
                height={360}
                className="mx-auto h-auto w-[148px]"
                preload
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Stepper
          value={currentStep}
          onValueChange={goTo}
          className={currentStep === 1 ? "mt-[78px]" : "mt-[52px]"}
        >
          <StepperNav aria-label="Progresso da configuração">
            {steps.map((title, index) => {
              const step = index + 1;
              return (
                <StepperItem
                  key={title}
                  step={step}
                  className="relative flex-1 items-start"
                  disabled={step > highestStep}
                >
                  <StepperTrigger className="flex w-full flex-col gap-3 rounded-md">
                    <StepperIndicator className="size-6 data-[state=inactive]:bg-[#E5E5E5] data-[state=inactive]:text-muted-foreground">
                      {step}
                    </StepperIndicator>
                    <StepperTitle className="whitespace-nowrap text-xs font-normal text-muted-foreground group-data-[state=active]/step:font-semibold group-data-[state=active]/step:text-foreground sm:text-sm">
                      {title}
                    </StepperTitle>
                  </StepperTrigger>
                  {step < steps.length && (
                    <StepperSeparator className="absolute left-[calc(50%+1rem)] top-3 h-px w-[calc(100%-2rem)] flex-none bg-border group-data-[state=completed]/step:bg-primary" />
                  )}
                </StepperItem>
              );
            })}
          </StepperNav>

          <StepperPanel className="mt-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                <StepperContent value={1} forceMount>
                  <StepHeading
                    title="Complete seu perfil"
                    description="Conte um pouco sobre você."
                  />
                  <form
                    className="mx-auto mt-8 max-w-[368px] space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      advance();
                    }}
                  >
                    <Field
                      label="Nome completo"
                      name="name"
                      defaultValue="Ana Oliveira"
                    />
                    <Field
                      label="Telefone"
                      name="phone"
                      type="tel"
                      defaultValue="(85) 99999-0000"
                    />
                    <div className="space-y-1.5">
                      <Label htmlFor="professional-role">
                        Atuação profissional
                      </Label>
                      <Select
                        value={professionalRole}
                        onValueChange={setProfessionalRole}
                      >
                        <SelectTrigger
                          id="professional-role"
                          className="h-11 w-full bg-card px-3 text-sm"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="management">
                            Gestão administrativa
                          </SelectItem>
                          <SelectItem value="clinical">
                            Profissional clínico
                          </SelectItem>
                          <SelectItem value="reception">Recepção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="mt-2 h-11 w-full">
                      Continuar
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Seu perfil pode ser atualizado depois.
                    </p>
                  </form>
                </StepperContent>

                <StepperContent value={2} forceMount>
                  <StepHeading
                    title="Crie sua clínica"
                    description="Defina o nome e o endereço da clínica no MedicalFlow."
                  />
                  <form
                    className="mx-auto mt-8 max-w-[368px] space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      advance();
                    }}
                  >
                    <Field
                      label="Nome da clínica"
                      name="clinicName"
                      defaultValue="Clínica Horizonte"
                    />
                    <Field
                      label="Identificador da clínica"
                      name="clinicSlug"
                      defaultValue="clinica-horizonte"
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    />
                    <p className="-mt-2 text-xs text-muted-foreground">
                      Seu acesso: /app/clinica-horizonte
                    </p>
                    <Button type="submit" className="mt-4 h-11 w-full">
                      Criar clínica e continuar
                    </Button>
                    <BackButton onClick={back} className="w-full" />
                  </form>
                </StepperContent>

                <StepperContent value={3} forceMount>
                  <StepHeading
                    title="Configure sua clínica"
                    description="Informe o endereço e o horário de funcionamento."
                  />
                  <form
                    className="mx-auto mt-8 max-w-[504px] space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      advance();
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)]">
                      <Field
                        label="CEP"
                        name="postalCode"
                        defaultValue="60000-000"
                      />
                      <Field
                        label="Endereço"
                        name="address"
                        defaultValue="Rua das Flores"
                      />
                      <Field label="Número" name="number" defaultValue="120" />
                      <Field
                        label="Complemento (opcional)"
                        name="complement"
                        defaultValue="Sala 02"
                        required={false}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                      <Field
                        label="Cidade"
                        name="city"
                        defaultValue="Fortaleza"
                      />
                      <div className="space-y-1.5">
                        <Label htmlFor="state">Estado</Label>
                        <Select value={state} onValueChange={setState}>
                          <SelectTrigger
                            id="state"
                            className="h-11 w-full bg-card px-3"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CE">CE</SelectItem>
                            <SelectItem value="SP">SP</SelectItem>
                            <SelectItem value="RJ">RJ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <fieldset className="space-y-3 pt-1">
                      <legend className="text-sm font-semibold">
                        Horário de funcionamento
                      </legend>
                      <div className="grid grid-cols-[1.5fr_0.65fr_auto_0.65fr] items-center gap-2 rounded-lg border bg-card p-3 text-xs sm:gap-3 sm:text-sm">
                        <span>Segunda a sexta</span>
                        <span>08:00</span>
                        <span className="text-muted-foreground">até</span>
                        <span>18:00</span>
                      </div>
                      <button
                        type="button"
                        className="cursor-pointer text-sm text-primary hover:underline"
                      >
                        + Adicionar outros dias e horários
                      </button>
                    </fieldset>
                    <div className="grid gap-3 pt-3 sm:grid-cols-[0.8fr_1.9fr] sm:gap-4">
                      <BackButton onClick={back} />
                      <Button type="submit" className="h-11">
                        Salvar e continuar
                      </Button>
                    </div>
                  </form>
                </StepperContent>

                <StepperContent value={4} forceMount>
                  <StepHeading
                    title="Convide sua equipe"
                    description="Envie convites para quem vai trabalhar com você."
                  />
                  <form
                    className="mx-auto mt-8 max-w-[504px] space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      unavailable();
                    }}
                  >
                    {invites.map((invite, index) => (
                      <div
                        className="grid gap-4 sm:grid-cols-[minmax(0,1.8fr)_minmax(160px,1fr)]"
                        key={`invite-${index + 1}`}
                      >
                        <Field
                          label="E-mail"
                          name={`invite-${index}`}
                          type="email"
                          value={invite.email}
                          onChange={(value) =>
                            setInvites((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, email: value }
                                  : item,
                              ),
                            )
                          }
                          required={false}
                        />
                        <div className="space-y-1.5">
                          <Label htmlFor={`role-${index}`}>Permissão</Label>
                          <Select
                            value={invite.role}
                            onValueChange={(role) =>
                              setInvites((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, role }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger
                              id={`role-${index}`}
                              className="h-11 w-full bg-card px-3"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="reception">
                                Recepção
                              </SelectItem>
                              <SelectItem value="clinical">
                                Profissional clínico
                              </SelectItem>
                              <SelectItem value="management">
                                Gestão administrativa
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="cursor-pointer text-sm text-primary hover:underline"
                      onClick={() =>
                        setInvites((items) => [
                          ...items,
                          { email: "", role: "reception" },
                        ])
                      }
                    >
                      + Adicionar pessoa
                    </button>
                    <p className="pt-3 text-sm text-muted-foreground">
                      Cada pessoa receberá um convite por e-mail.
                    </p>
                    <div className="grid gap-3 pt-3 sm:grid-cols-[0.8fr_1.9fr] sm:gap-4">
                      <BackButton onClick={back} />
                      <Button type="submit" className="h-11">
                        Enviar convites e concluir
                      </Button>
                    </div>
                    <button
                      type="button"
                      className="mx-auto block cursor-pointer text-sm text-muted-foreground hover:text-foreground"
                      onClick={unavailable}
                    >
                      Pular por enquanto
                    </button>
                  </form>
                </StepperContent>
              </motion.div>
            </AnimatePresence>
          </StepperPanel>
        </Stepper>
      </div>
    </main>
  );
}

function StepHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-normal tracking-[-0.035em] sm:text-[32px]">
        {title}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
  value,
  pattern,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  pattern?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        value={value}
        pattern={pattern}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className="h-11 bg-card px-3"
      />
    </div>
  );
}

function BackButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={`h-11 ${className ?? ""}`}
      onClick={onClick}
    >
      Voltar
    </Button>
  );
}
