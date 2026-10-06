import Image from "next/image";
import Link from "next/link";
import { AuthTransition } from "@/components/flowcare/auth-transition";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background py-28 text-foreground">
      <header className="absolute inset-x-0 top-7 flex justify-center">
        <Link href="/login" aria-label="Flowcare — entrar">
          <Image
            src="/logo-1.png"
            alt="Flowcare"
            width={1024}
            height={409}
            className="h-auto w-[148px]"
            preload
          />
        </Link>
      </header>
      <main className="mx-auto my-auto w-full max-w-[424px] px-6">
        <AuthTransition>{children}</AuthTransition>
      </main>
    </div>
  );
}
