"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import {
  saveOnboardingProfile,
  saveOnboardingProfileDraft,
} from "@/app/onboarding/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile, ProfileInput } from "@/lib/onboarding-profile";

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
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  function update<K extends keyof ProfileInput>(
    key: K,
    value: ProfileInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
    setDraftSaved(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setErrors({});
    setMessage("");
    try {
      const result = await saveOnboardingProfile(values);
      if (result.ok) {
        router.replace("/onboarding/clinic");
        router.refresh();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
    } finally {
      setPending(false);
    }
  }

  async function onSaveDraft() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await saveOnboardingProfileDraft(values);
      setDraftSaved(result.ok);
      if (!result.ok) setMessage(result.message);
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
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(event) => update("fullName", event.target.value)}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          maxLength={120}
          required
        />
        {errors.fullName && (
          <p id="fullName-error" className="text-sm text-destructive">
            {errors.fullName}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone com DDD</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          maxLength={20}
          required
        />
        {errors.phone && (
          <p id="phone-error" className="text-sm text-destructive">
            {errors.phone}
          </p>
        )}
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
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
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
              name="professionalTitle"
              value={values.professionalTitle}
              onChange={(event) =>
                update("professionalTitle", event.target.value)
              }
              aria-invalid={!!errors.professionalTitle}
              aria-describedby={
                errors.professionalTitle ? "professionalTitle-error" : undefined
              }
              maxLength={120}
              required
            />
            {errors.professionalTitle && (
              <p
                id="professionalTitle-error"
                className="text-sm text-destructive"
              >
                {errors.professionalTitle}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registro profissional</Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              placeholder="Ex.: CRM/CE 123456"
              value={values.registrationNumber}
              onChange={(event) =>
                update("registrationNumber", event.target.value)
              }
              aria-invalid={!!errors.registrationNumber}
              aria-describedby={
                errors.registrationNumber
                  ? "registrationNumber-error"
                  : undefined
              }
              maxLength={80}
              required
            />
            {errors.registrationNumber && (
              <p
                id="registrationNumber-error"
                className="text-sm text-destructive"
              >
                {errors.registrationNumber}
              </p>
            )}
          </div>
        </>
      )}

      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
      {draftSaved && (
        <output className="text-sm text-primary">Rascunho salvo.</output>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={pending}
          className="sm:flex-1"
        >
          Salvar rascunho
        </Button>
        <Button type="submit" disabled={pending} className="sm:flex-1">
          {pending ? "Salvando..." : "Salvar e continuar"}
        </Button>
      </div>
    </form>
  );
}
