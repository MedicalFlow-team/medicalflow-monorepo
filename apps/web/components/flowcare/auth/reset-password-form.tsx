"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { resetPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { unwrapActionResult } from "@/lib/auth";
import {
  AuthSubmitButton,
  buttonClass,
  confirmationSchema,
  firstError,
  passwordSchema,
  showAuthError,
  showValidationError,
} from "./shared";

const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmation: confirmationSchema,
});

function validate(value: { password: string; confirmation: string }) {
  return (
    firstError(resetPasswordSchema, value) ??
    (value.password !== value.confirmation
      ? "As senhas precisam ser iguais."
      : undefined)
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const form = useForm({
    defaultValues: { password: "", confirmation: "" },
    validators: { onSubmit: ({ value }) => validate(value) },
    onSubmitInvalid: ({ value }) => showValidationError(validate(value)),
    onSubmit: async ({ value }) => {
      if (success) return;
      if (!token) {
        toast.error("Link inválido. Solicite um novo link de recuperação.");
        return;
      }
      try {
        unwrapActionResult(
          await resetPasswordAction({
            token,
            newPassword: value.password,
          }),
        );
        setSuccess(true);
        toast.success("Senha redefinida com sucesso! Entre com a nova senha.");
        router.replace("/login");
      } catch (cause) {
        showAuthError(cause);
      }
    },
  });

  return (
    <form
      className="space-y-[11px]"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="password">
        {(field) => (
          <Field className="gap-[3px]">
            <FieldLabel
              htmlFor={field.name}
              className="required text-base font-normal leading-5"
            >
              Senha
            </FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              placeholder="Digite sua nova senha"
              required
              disabled={success}
              className="h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      </form.Field>
      <form.Field name="confirmation">
        {(field) => (
          <Field className="gap-[11px]">
            <FieldLabel
              htmlFor={field.name}
              className="required text-base font-normal leading-5"
            >
              Confirmar senha
            </FieldLabel>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              placeholder="Confirme sua senha"
              required
              disabled={success}
              className="h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </Field>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <AuthSubmitButton
            pending={pending}
            success={success}
            label="Alterar"
            pendingLabel="Alterando..."
            successLabel="Senha alterada!"
          />
        )}
      </form.Subscribe>
      <Button asChild variant="outline" className={`${buttonClass} h-12`}>
        <Link href="/login">Voltar para login</Link>
      </Button>
    </form>
  );
}
