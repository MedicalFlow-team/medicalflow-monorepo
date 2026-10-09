import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { clinicInputSchema, slugify } from "../lib/onboarding-clinic";

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "valid-session-jwt" }),
  }),
}));

const { checkSlugAction, createClinicAction } = await import(
  "../app/onboarding/clinic/actions"
);

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.API_INTERNAL_URL;

beforeEach(() => {
  process.env.API_INTERNAL_URL = "http://api.test/api";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.API_INTERNAL_URL;
  else process.env.API_INTERNAL_URL = originalApiUrl;
});

function respondWith(body: unknown, status = 200) {
  globalThis.fetch = (async () =>
    Response.json(body, { status })) as unknown as typeof fetch;
}

test("slugify normaliza texto para slug válido sem acentos", () => {
  expect(slugify("Clínica Vida & Saúde")).toBe("clinica-vida-saude");
  expect(slugify("   São   Paulo  ")).toBe("sao-paulo");
  expect(slugify("Dr. João #1!")).toBe("dr-joao-1");
  expect(slugify("---teste---")).toBe("teste");
});

test("clinicInputSchema valida regras de nome e slug", () => {
  const valid = { name: "Clínica Nova", slug: "clinica-nova" };
  expect(clinicInputSchema.safeParse(valid).success).toBe(true);

  expect(
    clinicInputSchema.safeParse({ name: "A", slug: "clinica-nova" }).success,
  ).toBe(false);

  expect(
    clinicInputSchema.safeParse({ name: "Clínica", slug: "A" }).success,
  ).toBe(false);

  expect(
    clinicInputSchema.safeParse({ name: "Clínica", slug: "clinica_nova" })
      .success,
  ).toBe(false);
});

test("checkSlugAction recusa entrada vazia ou menor que 2 caracteres sem chamar backend", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json({});
  }) as unknown as typeof fetch;

  const result = await checkSlugAction("-");
  expect(result.ok).toBe(false);
  expect(called).toBe(false);
});

test("checkSlugAction consulta disponibilidade com sucesso", async () => {
  respondWith({ available: true, slug: "clinica-vida" }, 200);
  const result = await checkSlugAction("Clínica Vida");
  expect(result).toEqual({
    ok: true,
    data: { available: true, slug: "clinica-vida" },
  });
});

test("createClinicAction normaliza slug e cria clínica com sucesso", async () => {
  respondWith(
    {
      organization: {
        id: "org-1",
        name: "Clínica Vida & Saúde",
        slug: "clinica-vida-saude",
        role: "ADMIN",
        isOwner: true,
      },
    },
    201,
  );

  const result = await createClinicAction({
    name: "Clínica Vida & Saúde",
    slug: "",
  });

  expect(result).toEqual({
    ok: true,
    data: {
      organization: {
        id: "org-1",
        name: "Clínica Vida & Saúde",
        slug: "clinica-vida-saude",
        role: "ADMIN",
        isOwner: true,
      },
    },
  });
});

test("createClinicAction mapeia erro de slug já em uso (ALREADY_EXISTS)", async () => {
  respondWith(
    { error: { code: "ALREADY_EXISTS", message: "Este slug já está em uso." } },
    409,
  );

  const result = await createClinicAction({
    name: "Clínica Existente",
    slug: "clinica-existente",
  });

  expect(result).toMatchObject({
    ok: false,
    error: { code: "ALREADY_EXISTS" },
  });
});
