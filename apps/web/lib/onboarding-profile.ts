import { z } from "zod";

export const profileInput = z
  .object({
    fullName: z.string().trim().min(3, "Informe seu nome completo.").max(120),
    phone: z
      .string()
      .trim()
      .refine((value) => {
        const digits = value.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      }, "Informe um telefone válido com DDD."),
    professionalRole: z.enum(["MANAGEMENT", "CLINICAL", "RECEPTION"]),
    professionalTitle: z.string().trim().max(120),
    registrationNumber: z.string().trim().max(80),
  })
  .superRefine((value, context) => {
    if (value.professionalRole !== "CLINICAL") return;
    if (!value.professionalTitle) {
      context.addIssue({
        code: "custom",
        path: ["professionalTitle"],
        message: "Informe sua profissão ou especialidade.",
      });
    }
    if (!value.registrationNumber) {
      context.addIssue({
        code: "custom",
        path: ["registrationNumber"],
        message: "Informe seu registro profissional.",
      });
    }
  });

export const profileDraftInput = z.object({
  fullName: z.string().max(120),
  phone: z.string().max(20),
  professionalRole: z.enum(["MANAGEMENT", "CLINICAL", "RECEPTION"]),
  professionalTitle: z.string().max(120),
  registrationNumber: z.string().max(80),
});

export type ProfileInput = z.input<typeof profileInput>;

export const profileResponse = z.object({
  fullName: z.string(),
  phone: z.string().nullable(),
  professionalRole: z.string().nullable(),
  professionalTitle: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  completed: z.boolean(),
});

export type Profile = z.infer<typeof profileResponse>;
