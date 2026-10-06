import type { Metadata } from "next";
import { AuthForm } from "@/components/flowcare/auth-form";

export const metadata: Metadata = { title: "Nova senha | Flowcare" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <section aria-labelledby="auth-title">
      <h1
        id="auth-title"
        className="mb-3 text-center text-4xl font-normal leading-[44px] tracking-[-0.04em]"
      >
        Nova senha
      </h1>
      <AuthForm mode="reset-password" token={token} />
    </section>
  );
}
