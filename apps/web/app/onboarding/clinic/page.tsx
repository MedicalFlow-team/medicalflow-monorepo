import type { Metadata } from "next";

export const metadata: Metadata = { title: "Próxima etapa | Flowcare" };

export default function OnboardingClinicPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 px-6 py-12">
      <p className="text-sm font-medium text-primary">Perfil salvo</p>
      <h1 className="text-3xl font-semibold">Próxima etapa: sua clínica</h1>
      <p className="text-muted-foreground">
        Seus dados pessoais foram salvos. A configuração da clínica será
        disponibilizada aqui na próxima etapa do onboarding.
      </p>
    </main>
  );
}
