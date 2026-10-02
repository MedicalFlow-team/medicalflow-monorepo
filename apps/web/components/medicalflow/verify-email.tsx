"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unwrapActionResult } from "@/lib/auth";

const COOLDOWN_SECONDS = 60;

export function VerifyEmail({
  token,
  initialEmail,
}: {
  token?: string;
  initialEmail?: string;
}) {
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!retryAt) return;
    const update = () =>
      setSecondsLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  function confirm() {
    if (!token || pending) return;
    setPending(true);
    setError("");
    startTransition(async () => {
      try {
        unwrapActionResult(await verifyEmailAction({ token }));
        setVerified(true);
        setMessage("E-mail confirmado. Entre na sua conta para continuar.");
      } catch (cause) {
        setError(
          cause instanceof Error && cause.name === "INVALID_TOKEN"
            ? "Este link é inválido, expirou ou já foi usado. Solicite outro abaixo."
            : cause instanceof Error
              ? cause.message
              : "Não foi possível confirmar o e-mail.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || Date.now() < retryAt) return;
    const email = String(
      new FormData(event.currentTarget).get("email") ?? "",
    ).trim();
    setPending(true);
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        unwrapActionResult(await resendVerificationAction({ email }));
        setMessage(
          "Se a conta estiver pendente, um novo link será enviado para o e-mail informado.",
        );
        const nextRetry = Date.now() + COOLDOWN_SECONDS * 1000;
        setRetryAt(nextRetry);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível solicitar outro link.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <div className="space-y-5">
      {token && !verified && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Confirme seu endereço para acessar o MedicalFlow. O link pode ser
            usado uma única vez.
          </p>
          <Button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="w-full"
          >
            {pending ? "Confirmando..." : "Confirmar e-mail"}
          </Button>
        </div>
      )}
      {!token && (
        <p className="text-sm text-muted-foreground">
          Confira sua caixa de entrada. Se o link expirou, solicite outro
          abaixo.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && <output className="block text-sm">{message}</output>}
      {verified ? (
        <Button asChild className="w-full">
          <Link href="/login?returnTo=%2Fonboarding%2Fprofile">
            Entrar para continuar
          </Link>
        </Button>
      ) : (
        <form onSubmit={resend} className="space-y-3">
          <Label htmlFor="verify-email">Precisa de outro link?</Label>
          <Input
            id="verify-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={initialEmail}
            maxLength={254}
            required
          />
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={pending || secondsLeft > 0}
          >
            {secondsLeft > 0
              ? `Reenviar em ${secondsLeft}s`
              : "Reenviar e-mail"}
          </Button>
        </form>
      )}
      <Link href="/login" className="block text-center text-sm underline">
        Voltar para login
      </Link>
    </div>
  );
}
