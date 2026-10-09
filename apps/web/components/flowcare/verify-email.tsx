"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
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
            ? "Este link expirou ou já foi usado."
            : cause instanceof Error
              ? cause.message
              : "Não foi possível confirmar o e-mail.",
        );
      } finally {
        setPending(false);
      }
    });
  }

  function resend() {
    if (pending || Date.now() < retryAt || !initialEmail) return;
    setPending(true);
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        unwrapActionResult(
          await resendVerificationAction({ email: initialEmail }),
        );
        setMessage("Link reenviado com sucesso.");
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
          <p className="text-center text-sm text-muted-foreground">
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
        <p className="text-center text-sm text-muted-foreground">
          {initialEmail ? (
            <>
              Enviamos o link para o e-mail{" "}
              <span className="font-medium text-foreground">
                {initialEmail}
              </span>
              .
            </>
          ) : (
            "Enviamos o link para o seu e-mail."
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <output className="block text-center text-sm text-muted-foreground">
          {message}
        </output>
      )}
      {showResend && initialEmail && (
        <Button
          type="button"
          onClick={resend}
          className="h-[46px] w-full rounded-lg text-base font-normal"
          disabled={pending || secondsLeft > 0}
        >
          {secondsLeft > 0 ? `Reenviar em ${secondsLeft}s` : "Reenviar e-mail"}
        </Button>
      )}
    </div>
  );
}
