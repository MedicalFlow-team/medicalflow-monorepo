"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClinicAction } from "@/app/onboarding/clinic/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { clinicInputSchema } from "@/lib/onboarding-clinic";

export function ClinicForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setNameError(undefined);
    const validation = clinicInputSchema.shape.name.safeParse(name);

    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ?? "Informe o nome da clínica.";
      setNameError(message);
      toast.error(message);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createClinicAction({ name: validation.data });
        if (!result.ok) {
          toast.error(
            result.error.code === "ALREADY_EXISTS"
              ? "Não foi possível gerar um endereço para a clínica. Tente novamente."
              : result.error.message,
          );
          return;
        }

        toast.success("Clínica criada com sucesso!");
        router.replace("/");
      } catch {
        toast.error("Erro ao criar a clínica. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="clinic-name" className="required">
          Nome da clínica
        </Label>
        <Input
          id="clinic-name"
          name="name"
          autoComplete="organization"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
          placeholder="Ex.: Clínica Vida & Saúde"
          aria-invalid={!!nameError}
          maxLength={120}
          required
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push("/onboarding/profile?edit=1")}
          className="h-[46px] rounded-lg px-5 text-base font-normal"
        >
          Voltar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-[46px] rounded-lg px-5 text-base font-normal"
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 size-4" />
              Criando clínica...
            </>
          ) : (
            "Continuar"
          )}
        </Button>
      </div>
    </form>
  );
}
