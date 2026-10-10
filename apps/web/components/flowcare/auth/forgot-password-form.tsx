"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { unwrapActionResult } from "@/lib/auth";
import {
  AuthInputField,
  AuthSubmitButton,
  buttonClass,
  emailSchema,
  firstError,
  showAuthError,
  showValidationError,
} from "./shared";

const forgotPasswordSchema = z.object({ email: emailSchema });

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onSubmit: ({ value }) =>
        firstError(forgotPasswordSchema, { email: value.email.trim() }),
    },
    onSubmitInvalid: ({ value }) =>
      showValidationError(
        firstError(forgotPasswordSchema, { email: value.email.trim() }),
      ),
    onSubmit: async ({ value }) => {
      if (success) return;
      try {
        unwrapActionResult(
          await forgotPasswordAction({ email: value.email.trim() }),
        );
        setSuccess(true);
        toast.success("Link enviado", {
          description:
            "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
        });
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
      <form.Field name="email">
        {(field) => (
          <AuthInputField
            id={field.name}
            name={field.name}
            label="Email"
            type="email"
            autoComplete="username"
            maxLength={254}
            placeholder="Digite seu e-mail cadastrado"
            required
            disabled={success}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <AuthSubmitButton
            pending={pending}
            success={success}
            label="Enviar Link"
            pendingLabel="Enviando..."
            successLabel="Link enviado"
          />
        )}
      </form.Subscribe>
      <Button asChild variant="outline" className={`${buttonClass} h-12`}>
        <Link href="/login">Voltar para login</Link>
      </Button>
    </form>
  );
}
