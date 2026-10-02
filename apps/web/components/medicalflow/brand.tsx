import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/app" className="inline-flex max-w-full items-center">
      <Image
        src="/logo-1.svg"
        alt="MedicalFlow"
        width={1900}
        height={360}
        className="h-auto w-48 max-w-full"
      />
    </Link>
  );
}
