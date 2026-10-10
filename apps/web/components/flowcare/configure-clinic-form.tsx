"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  saveClinicAddress,
  saveClinicContact,
} from "@/app/onboarding/configure-clinic/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ClinicDetails,
  type ClinicDetailsInput,
  clinicAddressSchema,
  clinicContactSchema,
} from "@/lib/clinic-details";

type Field = {
  key: Exclude<keyof ClinicDetailsInput, "version">;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: string;
};

const contactFields: Field[] = [
  {
    key: "legalName",
    label: "Razão social",
    placeholder: "Razão social da clínica",
    required: true,
  },
  { key: "taxId", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  {
    key: "contactEmail",
    label: "E-mail de contato",
    placeholder: "contato@clinica.com.br",
    required: true,
    type: "email",
  },
  {
    key: "contactPhone",
    label: "Telefone de contato",
    placeholder: "(85) 99999-9999",
    required: true,
    type: "tel",
  },
];

const addressFields: Field[] = [
  { key: "postalCode", label: "CEP", placeholder: "00000000", required: true },
  { key: "state", label: "Estado", placeholder: "UF", required: true },
  { key: "city", label: "Cidade", placeholder: "Cidade", required: true },
  { key: "district", label: "Bairro", placeholder: "Bairro", required: true },
  {
    key: "street",
    label: "Logradouro",
    placeholder: "Rua ou avenida",
    required: true,
  },
  {
    key: "streetNumber",
    label: "Número",
    placeholder: "Número",
    required: true,
  },
  {
    key: "addressComplement",
    label: "Complemento",
    placeholder: "Sala, bloco ou referência",
  },
];
const inputClass =
  "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";
const buttonClass = "h-[46px] rounded-lg px-5 text-base font-normal";

export function ConfigureClinicForm({
  initial,
  step,
}: {
  initial: ClinicDetails;
  step: "contact" | "address";
}) {
  const router = useRouter();
  const [values, setValues] = useState<ClinicDetailsInput>(() => {
    const {
      name: _name,
      slug: _slug,
      completed: _completed,
      ...input
    } = initial;
    return input;
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof ClinicDetailsInput, string>>
  >({});
  const [pending, setPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const fields = step === "contact" ? contactFields : addressFields;
  const dirty = fields.some(
    (field) => values[field.key] !== initial[field.key],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = (
      step === "contact" ? clinicContactSchema : clinicAddressSchema
    ).safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [
            key,
            messages?.[0],
          ]),
        ),
      );
      toast.error("Confira os campos destacados.");
      return;
    }
    setPending(true);
    try {
      const result = await (step === "contact"
        ? saveClinicContact(initial.slug, values)
        : saveClinicAddress(initial.slug, values));
      if (!result.ok) {
        if (result.fieldErrors)
          setErrors(
            Object.fromEntries(
              Object.entries(result.fieldErrors).map(([key, messages]) => [
                key,
                messages?.[0],
              ]),
            ),
          );
        if (result.code === "CONFLICT") setConflict(true);
        toast.error(result.message);
        return;
      }
      toast.success("Dados da clínica salvos.");
      router.replace(
        step === "contact" ? "/onboarding/configure-clinic/address" : "/",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 space-y-5">
      {dirty && !conflict && (
        <output className="text-sm text-muted-foreground">
          Alterações não salvas
        </output>
      )}
      {conflict && (
        <p role="alert" className="text-sm text-destructive">
          Outra pessoa atualizou esta clínica. Recarregue a página antes de
          salvar novamente.
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className={
              field.key === "legalName" ||
              field.key === "contactEmail" ||
              field.key === "street"
                ? "space-y-2 sm:col-span-2"
                : "space-y-2"
            }
          >
            <Label
              htmlFor={field.key}
              className={field.required ? "required" : undefined}
            >
              {field.label}
            </Label>
            <Input
              className={inputClass}
              id={field.key}
              name={field.key}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              value={values[field.key]}
              required={field.required}
              aria-invalid={!!errors[field.key]}
              aria-describedby={
                errors[field.key] ? `${field.key}-error` : undefined
              }
              disabled={pending || conflict}
              onChange={(event) => {
                setValues((old) => ({
                  ...old,
                  [field.key]: event.target.value,
                }));
                setErrors((old) => ({ ...old, [field.key]: undefined }));
              }}
            />
            {errors[field.key] && (
              <p id={`${field.key}-error`} className="text-sm text-destructive">
                {errors[field.key]}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end pt-2">
        <Button
          type="submit"
          className={buttonClass}
          disabled={pending || conflict}
        >
          {pending ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </form>
  );
}
