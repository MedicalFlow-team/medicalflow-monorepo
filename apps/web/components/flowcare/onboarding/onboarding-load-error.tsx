"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function OnboardingLoadError({ message }: { message: string }) {
  useEffect(() => {
    toast.error(message);
  }, [message]);

  return (
    <Button
      type="button"
      variant="outline"
      className="mt-8 h-[46px] rounded-lg px-5 text-base font-normal"
      onClick={() => window.location.reload()}
    >
      Tentar novamente
    </Button>
  );
}
