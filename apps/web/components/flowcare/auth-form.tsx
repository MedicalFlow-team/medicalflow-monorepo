"use client";

import { useForm } from "@tanstack/react-form";
import { CheckIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { destinationAfterLogin, unwrapActionResult } from "@/lib/auth";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

const submitLabels: Record<AuthMode, string> = {
  login: "Entrar",
  register: "Cadastrar",
  "forgot-password": "Enviar Link",
  "reset-password": "Alterar",
};

const pendingLabels: Record<AuthMode, string> = {
  login: "Entrando...",
  register: "Cadastrando...",
  "forgot-password": "Enviando...",
  "reset-password": "Alterando...",
};

const successLabels: Record<AuthMode, string> = {
  login: "Entrando...",
  register: "Cadastrado!",
  "forgot-password": "Link enviado",
  "reset-password": "Senha alterada!",
};

const emailSchema = z.email("Informe um e-mail válido.").max(254);
const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter no mínimo 8 caracteres.")
  .max(72);
const confirmationSchema = z.string().min(1, "Confirme sua senha.").max(72);

function validateAuthForm(
  mode: AuthMode,
  value: {
    fullName: string;
    email: string;
    password: string;
    confirmation: string;
    acceptedTerms: boolean;
  },
): string | undefined {
  const fields = {
    fullName: value.fullName.trim(),
    email: value.email.trim(),
    password: value.password,
    confirmation: value.confirmation,
    acceptedTerms: value.acceptedTerms,
  };
  const schema =
    mode === "login"
      ? z.object({
          email: emailSchema,
          password: z.string().min(1, "Informe sua senha.").max(72),
        })
      : mode === "forgot-password"
        ? z.object({ email: emailSchema })
        : mode === "register"
          ? z.object({
              fullName: z
                .string()
                .min(3, "Informe seu nome completo.")
                .max(120),
              email: emailSchema,
              password: passwordSchema,
              confirmation: confirmationSchema,
              acceptedTerms: z.literal(
                true,
                "É necessário aceitar os termos para criar a conta.",
              ),
            })
          : z.object({
              password: passwordSchema,
              confirmation: confirmationSchema,
            });
  const result = schema.safeParse(fields);
  if (!result.success) return result.error.issues[0]?.message;
  if (
    (mode === "register" || mode === "reset-password") &&
    fields.password !== fields.confirmation
  ) {
    return "As senhas precisam ser iguais.";
  }
  return undefined;
}

export function AuthForm({
  mode,
  token,
  returnTo,
}: {
  mode: AuthMode;
  token?: string;
  returnTo?: string | null;
}) {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);
  const isReset = mode === "reset-password";
  const isRegister = mode === "register";
  const showPassword = mode !== "forgot-password";
  const inputClass =
    "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";
  const buttonClass =
    "h-[46px] w-full cursor-pointer rounded-lg text-base font-normal";
  const labelClass = "required text-base font-normal leading-5";

  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmation: "",
      acceptedTerms: false,
    },
    validators: {
      onSubmit: ({ value }) => validateAuthForm(mode, value),
    },
    onSubmitInvalid: ({ value }) => {
      toast.error(
        validateAuthForm(mode, value) ?? "Verifique os dados informados.",
      );
    },
    onSubmit: async ({ value }) => {
      if (isSuccess) return;
      if (isReset && !token) {
        toast.error("Link inválido. Solicite um novo link de recuperação.");
        return;
      }
      const email = value.email.trim();
      const password = value.password;
      try {
        if (mode === "login") {
          const result = unwrapActionResult(
            await loginAction({ email, password }),
          );
          setIsSuccess(true);
          router.replace(destinationAfterLogin(result, returnTo ?? null));
          router.refresh();
        } else if (mode === "register") {
          unwrapActionResult(
            await registerAction({
              fullName: value.fullName.trim(),
              email,
              password,
              acceptedTerms: true,
            }),
          );
          setIsSuccess(true);
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } else if (mode === "forgot-password") {
          unwrapActionResult(await forgotPasswordAction({ email }));
          setIsSuccess(true);
          toast.success("Link enviado", {
            description:
              "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
          });
        } else {
          unwrapActionResult(
            await resetPasswordAction({
              token: token ?? "",
              newPassword: password,
            }),
          );
          setIsSuccess(true);
          toast.success(
            "Senha redefinida com sucesso! Entre com a nova senha.",
          );
          router.replace("/login");
        }
      } catch (cause) {
        setIsSuccess(false);
        if (cause instanceof Error && cause.name === "ACCOUNT_NOT_VERIFIED") {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } else if (cause instanceof Error && cause.name === "INVALID_TOKEN") {
          toast.error(
            "Este link é inválido ou expirou. Solicite um novo link.",
          );
        } else if (
          cause instanceof Error &&
          cause.name === "INVALID_CREDENTIALS"
        ) {
          toast.error("E-mail ou senha inválidos.");
        } else {
          toast.error(
            cause instanceof Error
              ? cause.message
              : "Não foi possível concluir a solicitação.",
          );
        }
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
      {isRegister && (
        <form.Field name="fullName">
          {(field) => (
            <Field className="gap-[3px]">
              <FieldLabel htmlFor={field.name} className={labelClass}>
                Nome completo
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                autoComplete="name"
                minLength={3}
                maxLength={120}
                className={inputClass}
                placeholder="Seu nome completo"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                disabled={isSuccess}
              />
            </Field>
          )}
        </form.Field>
      )}
      {!isReset && (
        <form.Field name="email">
          {(field) => (
            <Field className="gap-[3px]">
              <FieldLabel htmlFor={field.name} className={labelClass}>
                Email
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                autoComplete="username"
                maxLength={254}
                className={inputClass}
                placeholder={
                  mode === "forgot-password"
                    ? "Digite seu e-mail cadastrado"
                    : "seu@email.com"
                }
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                disabled={isSuccess}
              />
            </Field>
          )}
        </form.Field>
      )}
      {showPassword && (
        <form.Field name="password">
          {(field) => (
            <Field className="gap-[3px]">
              <FieldLabel htmlFor={field.name} className={labelClass}>
                Senha
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={mode === "login" ? undefined : 8}
                maxLength={72}
                className={inputClass}
                placeholder={
                  mode === "login"
                    ? "Digite sua senha"
                    : isReset
                      ? "Digite sua nova senha"
                      : "No mínimo 8 caracteres"
                }
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                disabled={isSuccess}
              />
            </Field>
          )}
        </form.Field>
      )}
      {(isReset || isRegister) && (
        <form.Field name="confirmation">
          {(field) => (
            <Field className="gap-[11px]">
              <FieldLabel htmlFor={field.name} className={labelClass}>
                Confirmar senha
              </FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                className={inputClass}
                placeholder="Confirme sua senha"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                disabled={isSuccess}
              />
            </Field>
          )}
        </form.Field>
      )}
      {mode === "login" && (
        <div className="text-right text-sm leading-5">
          <Link
            href="/forgot-password"
            className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            esqueceu a senha
          </Link>
        </div>
      )}
      {isRegister && (
        <form.Field name="acceptedTerms">
          {(field) => (
            <Field orientation="horizontal" className="gap-3 py-1">
              <Switch
                id="terms"
                name={field.name}
                required
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                disabled={isSuccess}
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
      )}
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <Button
            type="submit"
            className={buttonClass}
            disabled={pending || isSuccess}
          >
            {pending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2Icon className="size-4 animate-spin" />
                {pendingLabels[mode]}
              </span>
            ) : isSuccess ? (
              <span className="flex items-center justify-center gap-2">
                <CheckIcon className="size-4" />
                {successLabels[mode]}
              </span>
            ) : (
              submitLabels[mode]
            )}
          </Button>
        )}
      </form.Subscribe>
      {mode === "login" && (
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Criar Conta
          </Link>
        </p>
      )}
      {mode === "register" && (
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Entrar
          </Link>
        </p>
      )}
      {(isReset || mode === "forgot-password") && (
        <Button asChild variant="outline" className={`${buttonClass} h-12`}>
          <Link href="/login">Voltar para login</Link>
        </Button>
      )}
    </form>
  );
}
