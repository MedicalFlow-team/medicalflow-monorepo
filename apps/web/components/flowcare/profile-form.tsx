"use client";

import { ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { saveOnboardingProfile } from "@/app/onboarding/profile/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile, ProfileInput } from "@/lib/onboarding-profile";

const inputClass =
  "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";
const professionalRoles = {
  MANAGEMENT: "Gestão administrativa",
  CLINICAL: "Profissional clínico",
  RECEPTION: "Recepção",
} as const;

export function ProfileForm({ initialProfile }: { initialProfile: Profile }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileInput>({
    fullName: initialProfile.fullName,
    phone: initialProfile.phone ?? "",
    professionalRole:
      initialProfile.professionalRole === "CLINICAL" ||
      initialProfile.professionalRole === "RECEPTION"
        ? initialProfile.professionalRole
        : "MANAGEMENT",
    professionalTitle: initialProfile.professionalTitle ?? "",
    registrationNumber: initialProfile.registrationNumber ?? "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileInput, string>>
  >({});
  const [pending, setPending] = useState(false);

  function update<K extends keyof ProfileInput>(
    key: K,
    value: ProfileInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});
    try {
      const result = await saveOnboardingProfile(values);
      if (result.ok) {
        toast.success("Perfil concluído com sucesso!");
        router.replace("/onboarding/clinic");
        return;
      }
      setErrors(result.fieldErrors ?? {});
      const firstError =
        result.fieldErrors && Object.values(result.fieldErrors)[0];
      toast.error(
        firstError || result.message || "Verifique os dados informados.",
      );
    } finally {
      setPending(false);
    }
  }

  const clinical = values.professionalRole === "CLINICAL";

  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName" className="required">
          Nome completo
        </Label>
        <Input
          id="fullName"
          className={inputClass}
          placeholder="Seu nome completo"
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          aria-invalid={!!errors.fullName}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="required">
          Telefone com DDD
        </Label>
        <Input
          id="phone"
          className={inputClass}
          placeholder="(85) 99999-9999"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
          aria-invalid={!!errors.phone}
          maxLength={20}
          required
        />
      </div>

      <div className="space-y-2">
        <Label
          id="professionalRole-label"
          htmlFor="professionalRole"
          className="required"
        >
          Atuação profissional
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              id="professionalRole"
              type="button"
              aria-labelledby="professionalRole-label"
              disabled={pending}
              className="flex h-[47px] w-full items-center justify-between rounded-lg border border-transparent bg-card px-3 text-base outline-none focus-visible:border-primary disabled:opacity-50"
            >
              {professionalRoles[values.professionalRole]}
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={values.professionalRole}
              onValueChange={(value) =>
                update(
                  "professionalRole",
                  value as ProfileInput["professionalRole"],
                )
              }
            >
              <DropdownMenuRadioItem value="MANAGEMENT">
                Gestão administrativa
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="CLINICAL">
                Profissional clínico
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="RECEPTION">
                Recepção
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {clinical && (
        <>
          <div className="space-y-2">
            <Label htmlFor="professionalTitle" className="required">
              Profissão ou especialidade
            </Label>
            <Input
              id="professionalTitle"
              className={inputClass}
              placeholder="Ex.: Medicina"
              name="professionalTitle"
              value={values.professionalTitle}
              onChange={(event) =>
                update("professionalTitle", event.target.value)
              }
              aria-invalid={!!errors.professionalTitle}
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationNumber" className="required">
              Registro profissional
            </Label>
            <Input
              id="registrationNumber"
              className={inputClass}
              name="registrationNumber"
              placeholder="Ex.: CRM/CE 123456"
              value={values.registrationNumber}
              onChange={(event) =>
                update("registrationNumber", event.target.value)
              }
              aria-invalid={!!errors.registrationNumber}
              maxLength={80}
              required
            />
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={pending}
          className="h-[46px] rounded-lg px-5 text-base font-normal"
        >
          {pending ? "Continuando..." : "Continuar"}
        </Button>
      </div>
    </form>
  );
}
