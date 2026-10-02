import type { Metadata } from "next";
import { AuthForm } from "@/components/medicalflow/auth-form";

export const metadata: Metadata = { title: "Nova senha | MedicalFlow" };

export default function Page() {
  return (
    <section aria-labelledby="auth-title">
      <h1
        id="auth-title"
        className="mb-3 text-center text-4xl font-normal leading-[44px] tracking-[-0.04em]"
      >
        Nova senha
      </h1>
      <AuthForm mode="reset-password" />
    </section>
  );
}
