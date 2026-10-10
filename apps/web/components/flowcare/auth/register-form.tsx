"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { registerAction } from "@/app/(auth)/actions";
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { unwrapActionResult } from "@/lib/auth";
import {
  AuthInputField,
  AuthSubmitButton,
  authLinkClass,
  confirmationSchema,
  emailSchema,
  firstError,
  passwordSchema,
  showAuthError,
  showValidationError,
} from "./shared";

const registerSchema = z.object({
  fullName: z.string().min(3, "Informe seu nome completo.").max(120),
  email: emailSchema,
  password: passwordSchema,
  confirmation: confirmationSchema,
  acceptedTerms: z.literal(
    true,
    "É necessário aceitar os termos para criar a conta.",
  ),
});

function validate(value: {
  fullName: string;
  email: string;
  password: string;
  confirmation: string;
  acceptedTerms: boolean;
}) {
  const message = firstError(registerSchema, {
    ...value,
    fullName: value.fullName.trim(),
    email: value.email.trim(),
  });
  return (
    message ??
    (value.password !== value.confirmation
      ? "As senhas precisam ser iguais."
      : undefined)
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmation: "",
      acceptedTerms: false,
    },
    validators: { onSubmit: ({ value }) => validate(value) },
    onSubmitInvalid: ({ value }) => showValidationError(validate(value)),
    onSubmit: async ({ value }) => {
      if (success) return;
      const email = value.email.trim();
      try {
        unwrapActionResult(
          await registerAction({
            fullName: value.fullName.trim(),
            email,
            password: value.password,
            acceptedTerms: true,
          }),
        );
        setSuccess(true);
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
      <form.Field name="fullName">
        {(field) => (
          <AuthInputField
            id={field.name}
            name={field.name}
            label="Nome completo"
            autoComplete="name"
            minLength={3}
            maxLength={120}
            placeholder="Seu nome completo"
            required
            disabled={success}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Field name="email">
        {(field) => (
          <AuthInputField
            id={field.name}
            name={field.name}
            label="Email"
            type="email"
            autoComplete="username"
            maxLength={254}
            placeholder="seu@email.com"
            required
            disabled={success}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <AuthInputField
            id={field.name}
            name={field.name}
            label="Senha"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            placeholder="No mínimo 8 caracteres"
            required
            disabled={success}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Field name="confirmation">
        {(field) => (
          <AuthInputField
            id={field.name}
            name={field.name}
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            placeholder="Confirme sua senha"
            required
            disabled={success}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            fieldGap="gap-[11px]"
          />
        )}
      </form.Field>
      <form.Field name="acceptedTerms">
        {(field) => (
          <Field orientation="horizontal" className="gap-3 py-1">
            <Switch
              id="terms"
              name={field.name}
              required
              checked={field.state.value}
              onCheckedChange={field.handleChange}
              disabled={success}
            />
            <FieldLabel
              htmlFor="terms"
              className="required block cursor-pointer text-xs font-normal leading-4"
            >
              Ao continuar, você concorda com nossos{" "}
              <span className="underline">Termos de serviço</span> e{" "}
              <span className="underline">Política de privacidade</span>.
            </FieldLabel>
          </Field>
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <AuthSubmitButton
            pending={pending}
            success={success}
            label="Cadastrar"
            pendingLabel="Cadastrando..."
            successLabel="Cadastrado!"
          />
        )}
      </form.Subscribe>
      <p className="pt-1 text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className={authLinkClass}>
          Entrar
        </Link>
      </p>
    </form>
  );
}
