import Image from "next/image";
import Link from "next/link";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col bg-background py-28 text-foreground">
      <header className="absolute inset-x-0 top-7 flex justify-center">
        <Link href="/app" aria-label="Flowcare — início">
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
      {children}
    </div>
  );
}
