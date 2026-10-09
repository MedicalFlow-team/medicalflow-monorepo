"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  checkSlugAction,
  createClinicAction,
} from "@/app/onboarding/clinic/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { clinicInputSchema, slugify } from "@/lib/onboarding-clinic";

const inputClass =
  "h-[47px] rounded-lg bg-card px-3 text-base md:text-base border-transparent focus-visible:border-primary";

export function ClinicForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCustomizingSlug, setIsCustomizingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "unavailable"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    slug?: string;
  }>({});
  const [isPending, startTransition] = useTransition();

  // Atualiza slug automaticamente quando o nome muda, a menos que o usuário tenha customizado
  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    const newName = event.target.value;
    setName(newName);
    setFieldErrors((prev) => ({ ...prev, name: undefined }));

    if (!isCustomizingSlug) {
      const generatedSlug = slugify(newName);
      setSlug(generatedSlug);
      setFieldErrors((prev) => ({ ...prev, slug: undefined }));
    }
  }

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value;
    const normalized = slugify(rawValue);
    setSlug(normalized);
    setFieldErrors((prev) => ({ ...prev, slug: undefined }));
  }

  // Verificação assíncrona com debounce da disponibilidade do slug
  useEffect(() => {
    if (!slug || slug.length < 2) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const result = await checkSlugAction(slug);
        if (result.ok) {
          setSlugStatus(result.data.available ? "available" : "unavailable");
        } else {
          setSlugStatus("idle");
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [slug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setFieldErrors({});

    const targetSlug = slug || slugify(name);
    const validation = clinicInputSchema.safeParse({ name, slug: targetSlug });

    if (!validation.success) {
      const issues: { name?: string; slug?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "name") issues.name = issue.message;
        if (issue.path[0] === "slug") issues.slug = issue.message;
      }
      setFieldErrors(issues);
      toast.error(
        validation.error.issues[0]?.message ??
          "Verifique os campos obrigatórios.",
      );
      return;
    }

    if (slugStatus === "unavailable") {
      setIsCustomizingSlug(true);
      setFieldErrors({ slug: "Este endereço já está em uso. Escolha outro." });
      toast.error("Este endereço já está em uso. Escolha outro.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createClinicAction(validation.data);
        if (!result.ok) {
          if (result.error.code === "ALREADY_EXISTS") {
            setIsCustomizingSlug(true);
            setFieldErrors({
              slug: "Este endereço já está em uso. Escolha outro.",
            });
            setSlugStatus("unavailable");
            toast.error("Este endereço já está em uso. Escolha outro.");
            return;
          }
          toast.error(result.error.message);
          return;
        }

        toast.success("Clínica criada com sucesso!");
        router.replace(
          `/app/${encodeURIComponent(result.data.organization.slug)}/dashboard`,
        );
        router.refresh();
      } catch {
        toast.error("Erro ao criar a clínica. Tente novamente.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="clinic-name" className="required">
          Nome da clínica
        </Label>
        <Input
          id="clinic-name"
          className={inputClass}
          name="name"
          autoComplete="organization"
          value={name}
          onChange={handleNameChange}
          placeholder="Ex.: Clínica Vida & Saúde"
          aria-invalid={!!fieldErrors.name}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Sua equipe acessará a clínica em{" "}
          <span className="font-mono font-medium text-foreground">
            app/{slug || "sua-clinica"}
          </span>
          .
        </p>
        {!isCustomizingSlug ? (
          <button
            type="button"
            onClick={() => setIsCustomizingSlug(true)}
            className="text-primary hover:underline"
          >
            Editar endereço
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clinic-slug" className="required">
                Endereço no Flowcare
              </Label>
              <button
                type="button"
                onClick={() => {
                  setSlug(slugify(name));
                  setFieldErrors((prev) => ({ ...prev, slug: undefined }));
                  setIsCustomizingSlug(false);
                }}
                className="text-xs font-normal text-primary hover:underline"
              >
                Gerar do nome
              </button>
            </div>
            <Input
              id="clinic-slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="clinica-vida-saude"
              aria-invalid={!!fieldErrors.slug || slugStatus === "unavailable"}
              maxLength={60}
              className={inputClass}
              required
            />
          </div>
        )}
        {(slugStatus === "checking" ||
          slugStatus === "available" ||
          slugStatus === "unavailable") && (
          <p
            className={`flex items-center gap-1.5 text-xs ${slugStatus === "unavailable" ? "text-destructive" : slugStatus === "available" ? "text-primary" : "text-muted-foreground"}`}
          >
            {slugStatus === "checking" && <Spinner className="size-3" />}
            {slugStatus === "checking"
              ? "Verificando endereço..."
              : slugStatus === "available"
                ? "Endereço disponível"
                : "Endereço indisponível"}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={
          isPending || slugStatus === "unavailable" || slugStatus === "checking"
        }
        className="h-[46px] w-full rounded-lg text-base font-normal"
      >
        {isPending ? (
          <>
            <Spinner className="size-4 mr-2" />
            Criando clínica...
          </>
        ) : (
          "Criar clínica e continuar"
        )}
      </Button>
    </form>
  );
}
