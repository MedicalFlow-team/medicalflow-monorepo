"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  saveClinicAddress,
  saveClinicContact,
} from "@/app/onboarding/configure-clinic/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  type ClinicDetails,
  type ClinicDetailsInput,
  clinicAddressSchema,
  clinicContactSchema,
} from "@/lib/clinic-details";
import { formatPhoneWithAreaCode } from "@/lib/phone";

type ClinicField = {
  key: Exclude<keyof ClinicDetailsInput, "version">;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: string;
};

const contactFields: ClinicField[] = [
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

const addressFields: ClinicField[] = [
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
  const [conflict, setConflict] = useState(false);
  const fields = step === "contact" ? contactFields : addressFields;
  const form = useForm({
    defaultValues: {
      version: initial.version,
      legalName: initial.legalName,
      taxId: initial.taxId,
      contactEmail: initial.contactEmail,
      contactPhone: formatPhoneWithAreaCode(initial.contactPhone),
      postalCode: initial.postalCode,
      state: initial.state,
      city: initial.city,
      district: initial.district,
      street: initial.street,
      streetNumber: initial.streetNumber,
      addressComplement: initial.addressComplement,
    },
    validators: {
      onSubmit: ({ value }) => {
        const parsed = (
          step === "contact" ? clinicContactSchema : clinicAddressSchema
        ).safeParse(value);
        return parsed.success ? undefined : parsed.error.issues[0]?.message;
      },
    },
    onSubmitInvalid: ({ value }) => {
      const parsed = (
        step === "contact" ? clinicContactSchema : clinicAddressSchema
      ).safeParse(value);
      toast.error(
        parsed.success
          ? "Confira os campos informados."
          : parsed.error.issues[0]?.message,
      );
    },
    onSubmit: async ({ value }) => {
      const result = await (step === "contact"
        ? saveClinicContact(initial.slug, value)
        : saveClinicAddress(initial.slug, value));
      if (!result.ok) {
        if (result.code === "CONFLICT") setConflict(true);
        toast.error(result.message);
        return;
      }
      toast.success("Dados da clínica salvos.");
      router.replace(
        step === "contact" ? "/onboarding/configure-clinic/address" : "/",
      );
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const dirty = fields.some(
    (field) =>
      values[field.key] !==
      (field.key === "contactPhone"
        ? formatPhoneWithAreaCode(initial.contactPhone)
        : initial[field.key]),
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
      className="mt-8 space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <form.Field name={field.key} key={field.key}>
            {(control) => (
              <Field
                className={
                  field.key === "legalName" ||
                  field.key === "contactEmail" ||
                  field.key === "street"
                    ? "sm:col-span-2"
                    : undefined
                }
              >
                <FieldLabel
                  htmlFor={field.key}
                  className={field.required ? "required" : undefined}
                >
                  {field.label}
                </FieldLabel>
                <Input
                  className={inputClass}
                  id={field.key}
                  name={control.name}
                  type={field.type ?? "text"}
                  inputMode={
                    field.key === "contactPhone" ? "numeric" : undefined
                  }
                  maxLength={field.key === "contactPhone" ? 15 : undefined}
                  placeholder={field.placeholder}
                  value={control.state.value}
                  required={field.required}
                  aria-invalid={!control.state.meta.isValid}
                  disabled={conflict}
                  onBlur={control.handleBlur}
                  onChange={(event) =>
                    control.handleChange(
                      field.key === "contactPhone"
                        ? formatPhoneWithAreaCode(event.target.value)
                        : event.target.value,
                    )
                  }
                />
              </Field>
            )}
          </form.Field>
        ))}
      </div>
      <div className="flex items-center justify-end pt-2">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button
              type="submit"
              className={buttonClass}
              disabled={pending || conflict}
            >
              {pending ? "Salvando..." : "Continuar"}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
