"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resetPasswordAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [pending, setPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const isReset = mode === "reset-password";
  const isRegister = mode === "register";
  const showPassword = mode !== "forgot-password";
  const inputClass =
    "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";
  const buttonClass =
    "h-[46px] w-full cursor-pointer rounded-lg text-base font-normal";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || isSuccess) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    if ((isReset || isRegister) && password !== confirmation) {
      toast.error("As senhas precisam ser iguais.");
      return;
    }
    if (isReset && !token) {
      toast.error("Link inválido. Solicite um novo link de recuperação.");
      return;
    }
    if (isRegister && !acceptedTerms) {
      toast.error("É necessário aceitar os termos para criar a conta.");
      return;
    }

    setPending(true);
    startTransition(async () => {
      try {
        if (mode === "login") {
          const result = unwrapActionResult(
            await loginAction({
              email,
              password,
            }),
          );
          setIsSuccess(true);
          router.replace(destinationAfterLogin(result, returnTo ?? null));
          router.refresh();
        } else if (mode === "register") {
          unwrapActionResult(
            await registerAction({
              fullName: String(data.get("fullName") ?? "").trim(),
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
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <form className="space-y-[11px]" onSubmit={onSubmit}>
      {isRegister && (
        <div className="space-y-[3px]">
          <Label htmlFor="fullName" className="text-base font-normal leading-5">
            Nome completo
          </Label>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            minLength={3}
            maxLength={120}
            className={inputClass}
            placeholder="Seu nome completo"
            required
            disabled={pending || isSuccess}
          />
        </div>
      )}
      {!isReset && (
        <div className="space-y-[3px]">
          <Label htmlFor="email" className="text-base font-normal leading-5">
            Email
          </Label>
          <Input
            id="email"
            name="email"
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
            disabled={pending || isSuccess}
          />
        </div>
      )}
      {showPassword && (
        <div className="space-y-[3px]">
          <Label htmlFor="password" className="text-base font-normal leading-5">
            Senha
          </Label>
          <Input
            id="password"
            name="password"
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
            disabled={pending || isSuccess}
          />
        </div>
      )}
      {(isReset || isRegister) && (
        <div className="space-y-[11px]">
          <Label
            htmlFor="confirmation"
            className="text-base font-normal leading-5"
          >
            Confirmar senha
          </Label>
          <Input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            className={inputClass}
            placeholder="Confirme sua senha"
            required
            disabled={pending || isSuccess}
          />
        </div>
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
        <div className="flex items-center gap-3 py-1">
          <Switch
            id="terms"
            name="terms"
            required
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            disabled={pending || isSuccess}
          />
          <Label
            htmlFor="terms"
            className="block cursor-pointer text-xs font-normal leading-4"
          >
            Ao continuar, você concorda com nossos{" "}
            <span className="underline">Termos de serviço</span> e{" "}
            <span className="underline">Política de privacidade</span>.
          </Label>
        </div>
      )}
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
