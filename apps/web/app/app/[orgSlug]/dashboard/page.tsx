import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAvailableOrganizations } from "@/server/organizations";
import { getSessionToken } from "@/server/session";

export const metadata: Metadata = { title: "Dashboard | Flowcare" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  if (!(await getSessionToken())) redirect("/login");

  const { orgSlug } = await params;
  const organizations = await getAvailableOrganizations();
  if (!organizations) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-16">
        <h1 className="text-2xl font-semibold">
          Não foi possível carregar a clínica
        </h1>
        <p className="mt-3 text-muted-foreground">
          Atualize a página para tentar novamente.
        </p>
      </main>
    );
  }
  const organization = organizations.find((item) => item.slug === orgSlug);
  if (!organization) notFound();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/app" aria-label="Flowcare — início">
            <Image
              src="/logo-1.png"
              alt="Flowcare"
              width={1024}
              height={409}
              className="h-auto w-[148px]"
            />
          </Link>
          <span className="text-sm font-medium">{organization.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-3 text-muted-foreground">
          Sua clínica {organization.name} está pronta no Flowcare.
        </p>
      </main>
    </div>
  );
}
