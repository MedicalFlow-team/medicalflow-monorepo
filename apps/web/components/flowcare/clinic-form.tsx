"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClinicAction } from "@/app/onboarding/clinic/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { clinicInputSchema } from "@/lib/onboarding-clinic";

const inputClass =
  "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";
const buttonClass = "h-[46px] rounded-lg px-5 text-base font-normal";

export function ClinicForm() {
  const router = useRouter();
  const form = useForm({
    defaultValues: { name: "" },
    validators: { onSubmit: clinicInputSchema.pick({ name: true }) },
    onSubmitInvalid: ({ value }) => {
      const parsed = clinicInputSchema.shape.name.safeParse(value.name);
      toast.error(
        parsed.success
          ? "Informe um nome válido para a clínica."
          : parsed.error.issues[0]?.message,
      );
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createClinicAction(value);
        if (!result.ok) {
          toast.error(
            result.error.code === "ALREADY_EXISTS"
              ? "Não foi possível gerar um endereço para a clínica. Tente novamente."
              : result.error.message,
          );
          return;
        }
        toast.success("Clínica criada com sucesso!");
        router.replace("/onboarding/configure-clinic");
      } catch {
        toast.error("Erro ao criar a clínica. Tente novamente.");
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="mt-8 space-y-5"
      noValidate
    >
      <form.Field name="name">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="clinic-name" className="required">
              Nome da clínica
            </FieldLabel>
            <Input
              id="clinic-name"
              className={inputClass}
              name={field.name}
              autoComplete="organization"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Ex.: Clínica Vida & Saúde"
              aria-invalid={!field.state.meta.isValid}
              maxLength={120}
              required
            />
          </Field>
        )}
      </form.Field>
      <div className="flex items-center justify-end gap-4">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(pending) => (
            <Button type="submit" disabled={pending} className={buttonClass}>
              {pending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Criando clínica...
                </>
              ) : (
                "Continuar"
              )}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
