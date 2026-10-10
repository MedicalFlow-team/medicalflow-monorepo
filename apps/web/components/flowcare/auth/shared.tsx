"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import type { ComponentProps } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const emailSchema = z.email("Informe um e-mail válido.").max(254);
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter no mínimo 8 caracteres.")
  .max(72);
export const confirmationSchema = z
  .string()
  .min(1, "Confirme sua senha.")
  .max(72);
export const buttonClass =
  "h-[46px] w-full cursor-pointer rounded-lg text-base font-normal";
export const authLinkClass =
  "font-medium text-foreground underline underline-offset-2";

export function firstError(schema: z.ZodType, value: unknown) {
  const result = schema.safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function showValidationError(message?: string) {
  toast.error(message ?? "Verifique os dados informados.");
}

export function showAuthError(cause: unknown) {
  if (cause instanceof Error && cause.name === "INVALID_TOKEN") {
    toast.error("Este link é inválido ou expirou. Solicite um novo link.");
  } else if (cause instanceof Error && cause.name === "INVALID_CREDENTIALS") {
    toast.error("E-mail ou senha inválidos.");
  } else {
    toast.error(
      cause instanceof Error
        ? cause.message
        : "Não foi possível concluir a solicitação.",
    );
  }
}

type AuthInputFieldProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  fieldGap?: string;
};

export function AuthInputField({
  label,
  value,
  onChange,
  onBlur,
  fieldGap = "gap-[3px]",
  ...inputProps
}: AuthInputFieldProps) {
  return (
    <Field className={fieldGap}>
      <FieldLabel
        htmlFor={inputProps.id}
        className="required text-base font-normal leading-5"
      >
        {label}
      </FieldLabel>
      <Input
        {...inputProps}
        className="h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function AuthSubmitButton({
  pending,
  success,
  label,
  pendingLabel,
  successLabel,
}: {
  pending: boolean;
  success: boolean;
  label: string;
  pendingLabel: string;
  successLabel: string;
}) {
  return (
    <Button type="submit" className={buttonClass} disabled={pending || success}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2Icon className="size-4 animate-spin" />
          {pendingLabel}
        </span>
      ) : success ? (
        <span className="flex items-center justify-center gap-2">
          <CheckIcon className="size-4" />
          {successLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}
