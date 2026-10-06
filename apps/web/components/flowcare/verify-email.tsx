"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { destinationAfterLogin, unwrapActionResult } from "@/lib/auth";

const COOLDOWN_SECONDS = 60;

export function VerifyEmail({
  token,
  initialEmail,
}: {
  token?: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showResend, setShowResend] = useState(!token);
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
        const result = unwrapActionResult(await verifyEmailAction({ token }));
        router.replace(destinationAfterLogin(result, null));
        router.refresh();
      } catch (cause) {
        if (cause instanceof Error && cause.name === "INVALID_TOKEN") {
          setShowResend(true);
        }
        setError(
          cause instanceof Error && cause.name === "INVALID_TOKEN"
            ? "Este link expirou ou já foi usado. Peça um novo abaixo."
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
      {token && !showResend && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Clique no botão abaixo para confirmar seu e-mail e continuar.
          </p>
          <Button
            type="button"
            onClick={confirm}
            disabled={pending}
            className="h-[46px] w-full rounded-lg text-base font-normal"
          >
            {pending ? "Confirmando..." : "Confirmar e-mail"}
          </Button>
        </div>
      )}
      {!token && (
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para seu e-mail. Confira a caixa de
          entrada e o spam. Se não encontrar a mensagem, peça outro link abaixo.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {message && <output className="block text-sm">{message}</output>}
      {showResend && (
        <form onSubmit={resend} className="space-y-3">
          <Label htmlFor="verify-email">E-mail para receber outro link</Label>
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
            className="h-[46px] w-full rounded-lg text-base font-normal"
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
