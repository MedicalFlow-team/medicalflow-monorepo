import Image from "next/image";
import Link from "next/link";
import { AuthTransition } from "@/components/medicalflow/auth-transition";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh bg-background text-foreground">
      <header className="absolute inset-x-0 top-7 flex justify-center">
        <Link href="/login" aria-label="MedicalFlow — entrar">
          <Image
            src="/logo-1.svg"
            alt="MedicalFlow"
            width={1900}
            height={360}
            className="h-auto w-[148px]"
            preload
          />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[424px] px-6 pb-12 pt-[max(140px,calc(36svh-3px))]">
        <AuthTransition>{children}</AuthTransition>
      </main>
    </div>
  );
}
