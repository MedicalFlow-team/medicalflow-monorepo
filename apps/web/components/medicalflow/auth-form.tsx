"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  destinationAfterLogin,
  type LoginResult,
  submitAuth,
} from "@/lib/auth";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

const submitLabels: Record<AuthMode, string> = {
  login: "Entrar",
  register: "Cadastrar",
  "forgot-password": "Enviar Link",
  "reset-password": "Alterar",
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isReset = mode === "reset-password";
  const isRegister = mode === "register";
  const showPassword = mode !== "forgot-password";
  const inputClass = "h-[47px] rounded-lg bg-card px-3 text-base md:text-base";
  const buttonClass =
    "h-[46px] w-full cursor-pointer rounded-lg text-base font-normal";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");
    setError("");
    setMessage("");

    if ((isReset || isRegister) && password !== confirmation) {
      setError("As senhas precisam ser iguais.");
      return;
    }
    if (isReset && !token) {
      setError("Link inválido. Solicite um novo link de recuperação.");
      return;
    }
    if (isRegister && !acceptedTerms) {
      setError("É necessário aceitar os termos para criar a conta.");
      return;
    }

    setPending(true);
    try {
      if (mode === "login") {
        const result = await submitAuth<LoginResult>("login", {
          email,
          password,
        });
        router.replace(destinationAfterLogin(result, returnTo ?? null));
        router.refresh();
      } else if (mode === "register") {
        await submitAuth("register", {
          fullName: String(data.get("fullName") ?? "").trim(),
          email,
          password,
        });
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (mode === "forgot-password") {
        await submitAuth("forgot-password", { email });
        setMessage(
          "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
        );
      } else {
        await submitAuth("reset-password", {
          token: token ?? "",
          newPassword: password,
        });
        setMessage(
          "Senha redefinida. Suas sessões anteriores foram encerradas.",
        );
      }
    } catch (cause) {
      if (cause instanceof Error && cause.name === "ACCOUNT_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (cause instanceof Error && cause.name === "INVALID_TOKEN") {
        setError("Este link é inválido ou expirou. Solicite um novo link.");
      } else if (
        cause instanceof Error &&
        cause.name === "INVALID_CREDENTIALS"
      ) {
        setError("E-mail ou senha inválidos.");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível concluir a solicitação.",
        );
      }
    } finally {
      setPending(false);
    }
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
            required
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
            required
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
            required
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
            required
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
        <div className="flex items-start gap-2 py-0.5">
          <Checkbox
            id="terms"
            name="terms"
            required
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            className="size-5 rounded border-0 bg-[#D9D9D9] data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
          <Label
            htmlFor="terms"
            className="block text-[10px] font-normal leading-3"
          >
            Ao continuar, você concorda com nossos{" "}
            <span className="underline">Termos de serviço</span> e{" "}
            <span className="underline">Política de privacidade</span>.
          </Label>
        </div>
      )}
      {(isRegister || isReset) && (
        <p className="text-xs text-muted-foreground">
          A senha deve ter entre 8 e 72 caracteres.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <output className="block text-sm text-foreground">{message}</output>
      )}
      {isReset && message && (
        <Link href="/login" className="block text-center text-sm underline">
          Entrar com a nova senha
        </Link>
      )}
      <Button
        type="submit"
        className={buttonClass}
        disabled={pending || (isReset && !!message)}
      >
        {pending ? "Aguarde..." : submitLabels[mode]}
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
