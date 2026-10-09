import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada | Flowcare",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col bg-background py-28 text-foreground">
      <header className="absolute inset-x-0 top-7 flex justify-center">
        <Link href="/" aria-label="Flowcare — início">
          <Image
            src="/logo-1.png"
            alt="Flowcare"
            width={1024}
            height={409}
            className="h-auto w-[148px]"
            priority
          />
        </Link>
      </header>
      <main className="mx-auto my-auto flex w-full max-w-[424px] flex-col items-center px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O endereço que você tentou acessar não existe ou foi alterado.
        </p>
        <Button
          asChild
          className="mt-6 h-[46px] w-full rounded-lg text-base font-normal cursor-pointer"
        >
          <Link href="/">Ir para o início</Link>
        </Button>
      </main>
    </div>
  );
}
