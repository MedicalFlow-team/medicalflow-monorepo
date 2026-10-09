"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  saveOnboardingProfile,
  saveOnboardingProfileDraft,
} from "@/app/onboarding/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile, ProfileInput } from "@/lib/onboarding-profile";

const inputClass =
  "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";

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
        router.refresh();
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

  async function onSaveDraft() {
    if (pending) return;
    setPending(true);
    try {
      const result = await saveOnboardingProfileDraft(values);
      if (result.ok) {
        toast.success("Rascunho salvo com sucesso.");
      } else {
        toast.error(result.message || "Erro ao salvar rascunho.");
      }
    } finally {
      setPending(false);
    }
  }

  const clinical = values.professionalRole === "CLINICAL";

  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
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
        <Label htmlFor="phone">Telefone com DDD</Label>
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
        <Label htmlFor="professionalRole">Atuação profissional</Label>
        <select
          id="professionalRole"
          name="professionalRole"
          value={values.professionalRole}
          onChange={(event) =>
            update(
              "professionalRole",
              event.target.value as ProfileInput["professionalRole"],
            )
          }
          className="h-[47px] w-full rounded-lg border border-transparent bg-card px-3 text-base focus-visible:border-primary md:text-base"
          required
        >
          <option value="MANAGEMENT">Gestão administrativa</option>
          <option value="CLINICAL">Profissional clínico</option>
          <option value="RECEPTION">Recepção</option>
        </select>
      </div>

      {clinical && (
        <>
          <div className="space-y-2">
            <Label htmlFor="professionalTitle">
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
            <Label htmlFor="registrationNumber">Registro profissional</Label>
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={pending}
          className="h-[46px] rounded-lg text-base font-normal sm:flex-1"
        >
          Salvar rascunho
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="h-[46px] rounded-lg text-base font-normal sm:flex-1"
        >
          {pending ? "Salvando..." : "Salvar e continuar"}
        </Button>
      </div>
    </form>
  );
}
