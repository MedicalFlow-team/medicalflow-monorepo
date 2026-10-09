import { MailIcon } from "lucide-react";
import type { Metadata } from "next";
import { VerifyEmail } from "@/components/flowcare/verify-email";

export const metadata: Metadata = { title: "Confirme seu e-mail | Flowcare" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  return (
    <section aria-labelledby="auth-title">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MailIcon className="size-7" />
      </div>
      <h1
        id="auth-title"
        className="mb-3 text-center text-4xl font-normal leading-[44px] tracking-[-0.04em]"
      >
        {token ? "Confirmando seu e-mail" : "Confirme seu e-mail"}
      </h1>
      <VerifyEmail token={token} initialEmail={email} />
    </section>
  );
}
