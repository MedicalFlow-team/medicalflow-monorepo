"use client";

import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  InboxIcon,
  MailIcon,
  RotateCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  resendVerificationAction,
  verifyEmailAction,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

  useEffect(() => {
    if (!token) return;
    let active = true;
    setPending(true);
    setError("");
    startTransition(async () => {
      try {
        const result = unwrapActionResult(await verifyEmailAction({ token }));
        if (active) {
          router.replace(destinationAfterLogin(result, null));
          router.refresh();
        }
      } catch (cause) {
        if (!active) return;
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
        if (active) {
          setPending(false);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [token, router]);

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
        setMessage(
          "Link reenviado com sucesso! Verifique sua caixa de entrada.",
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
      {token && !error && (
        <div className="space-y-4 py-4 text-center">
          <Spinner className="mx-auto size-7 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Confirmando seu e-mail...
            </p>
            <p className="text-xs text-muted-foreground">
              Aguarde um momento enquanto validamos seu link de acesso.
            </p>
          </div>
        </div>
      )}

      {token && error && !showResend && (
        <Button
          type="button"
          onClick={confirm}
          disabled={pending}
          className="h-[46px] w-full rounded-lg text-sm font-medium gap-2 cursor-pointer"
        >
          {pending && <Spinner className="size-4" />}
          {pending ? "Confirmando..." : "Tentar novamente"}
        </Button>
      )}

      {!token && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {initialEmail
              ? "Enviamos as instruções e o link de confirmação para:"
              : "Enviamos um link de confirmação para o seu e-mail cadastrado."}
          </p>

          {initialEmail && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-xs">
              <MailIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{initialEmail}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-relaxed">
            Abra a mensagem e clique no botão de verificação para ativar sua
            conta e começar a usar o Flowcare.
          </p>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-left text-xs text-muted-foreground space-y-2">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <InboxIcon className="size-3.5 text-primary shrink-0" />
              Não encontrou a mensagem?
            </p>
            <ul className="space-y-1 pl-1">
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span>
                  Verifique a pasta de <strong>Spam</strong> ou{" "}
                  <strong>Lixo eletrônico</strong>.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span>
                  O envio pode levar de 1 a 2 minutos dependendo do seu
                  provedor.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span>Confirme se o e-mail digitado está correto.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <output className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4 shrink-0" />
          <span>{message}</span>
        </output>
      )}

      {showResend && initialEmail && (
        <Button
          type="button"
          variant="outline"
          onClick={resend}
          className="h-[46px] w-full rounded-lg text-sm font-medium gap-2 cursor-pointer"
          disabled={pending || secondsLeft > 0}
        >
          {pending ? (
            <>
              <Spinner className="size-4" />
              <span>Reenviando e-mail...</span>
            </>
          ) : secondsLeft > 0 ? (
            <span>Reenviar em {secondsLeft}s</span>
          ) : (
            <>
              <RotateCwIcon className="size-4" />
              <span>Reenviar link de confirmação</span>
            </>
          )}
        </Button>
      )}

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Voltar para o login</span>
        </Link>
      </div>
    </div>
  );
}
