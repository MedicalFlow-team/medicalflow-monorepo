import type { Metadata } from "next";
import { VerifyEmail } from "@/components/flowcare/verify-email";

export const metadata: Metadata = { title: "Confirmar e-mail | Flowcare" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  return (
    <section aria-labelledby="auth-title">
      <h1
        id="auth-title"
        className="mb-3 text-center text-4xl font-normal leading-[44px] tracking-[-0.04em]"
      >
        Confirmar e-mail
      </h1>
      <VerifyEmail token={token} initialEmail={email} />
    </section>
  );
}
