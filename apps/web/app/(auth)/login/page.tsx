import type { Metadata } from "next";
import { AuthForm } from "@/components/medicalflow/auth-form";

export const metadata: Metadata = { title: "Entrar | MedicalFlow" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <section aria-labelledby="auth-title">
      <h1
        id="auth-title"
        className="mb-3 text-center text-4xl font-normal leading-[44px] tracking-[-0.04em]"
      >
        Entrar
      </h1>
      <AuthForm mode="login" returnTo={returnTo} />
    </section>
  );
}
