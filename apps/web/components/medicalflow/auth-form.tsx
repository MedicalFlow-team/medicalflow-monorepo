"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

const submitLabels: Record<AuthMode, string> = {
  login: "Entrar",
  register: "Cadastrar",
  "forgot-password": "Enviar Link",
  "reset-password": "Alterar",
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isReset = mode === "reset-password";
  const isRegister = mode === "register";
  const showPassword = mode !== "forgot-password";
  const inputClass = "h-[47px] rounded-lg bg-card px-3 text-base md:text-base";
  const buttonClass =
    "h-[46px] w-full cursor-pointer rounded-lg text-base font-normal";

  return (
    <form
      className="space-y-[11px]"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (isReset && data.get("password") !== data.get("confirmation")) {
          toast.error("As senhas precisam ser iguais.");
          return;
        }
        if (
          isReset &&
          !new URLSearchParams(window.location.search).get("token")
        ) {
          toast.error("Link inválido. Solicite um novo link de recuperação.");
          return;
        }
        // Connect the authentication API here; never simulate a successful session.
        toast.error(
          "Não foi possível concluir a solicitação. Tente novamente mais tarde.",
        );
      }}
    >
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
            className={inputClass}
            required
          />
        </div>
      )}
      {isReset && (
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
      <Button type="submit" className={buttonClass}>
        {submitLabels[mode]}
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
