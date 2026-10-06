import type { Metadata } from "next";

export const metadata: Metadata = { title: "Primeiro acesso | Flowcare" };

export default function OnboardingProfilePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 px-6 py-12">
      <h1 className="text-3xl font-semibold">Próximo passo: seu perfil</h1>
      <p className="text-muted-foreground">
        Sua conta está pronta. A próxima etapa é completar seu perfil pessoal
        antes de configurar a clínica.
      </p>
      <p className="text-sm text-muted-foreground">
        O formulário de perfil será disponibilizado nesta página em breve.
      </p>
    </main>
  );
}
