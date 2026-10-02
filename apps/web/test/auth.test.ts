import { afterEach, expect, test } from "bun:test";
import { POST } from "../app/api/auth/[action]/route";
import { destinationAfterLogin, safeReturnPath } from "../lib/auth";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("returnTo aceita somente destinos internos do aplicativo", () => {
  expect(safeReturnPath("/app/clinica/dashboard?tab=agenda")).toBe(
    "/app/clinica/dashboard?tab=agenda",
  );
  expect(safeReturnPath("//evil.example")).toBeNull();
  expect(safeReturnPath("/\\evil.example")).toBeNull();
  expect(safeReturnPath("https://evil.example")).toBeNull();
  expect(safeReturnPath("/login")).toBeNull();
});

test("login escolhe onboarding, clínica única ou seleção", () => {
  const result = {
    user: { id: "u1", email: "a@b.com", fullName: "Ana" },
    availableOrganizations: [
      {
        id: "o1",
        name: "Clínica",
        slug: "clinica",
        role: "ADMIN" as const,
        isOwner: true,
      },
    ],
    onboardingCompleted: false,
  };
  expect(destinationAfterLogin(result, null)).toBe("/onboarding/profile");
  expect(
    destinationAfterLogin({ ...result, onboardingCompleted: true }, null),
  ).toBe("/app/clinica/dashboard");
  expect(
    destinationAfterLogin(
      { ...result, onboardingCompleted: true, availableOrganizations: [] },
      null,
    ),
  ).toBe("/select-organization");
});

test("proxy de login guarda o token em cookie HttpOnly e não o envia ao navegador", async () => {
  globalThis.fetch = (async () =>
    Response.json({
      token: "jwt-secreto",
      user: { id: "u1", email: "a@b.com", fullName: "Ana" },
      availableOrganizations: [],
      onboardingCompleted: false,
    })) as unknown as typeof fetch;

  const response = await POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "senha" }),
    }),
    { params: Promise.resolve({ action: "login" }) },
  );

  expect(response.status).toBe(200);
  expect((await response.json()).token).toBeUndefined();
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
});

test("proxy preserva erro de credenciais e não cria sessão", async () => {
  globalThis.fetch = (async () =>
    Response.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Credenciais inválidas.",
        },
      },
      { status: 401 },
    )) as unknown as typeof fetch;

  const response = await POST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", password: "errada" }),
    }),
    { params: Promise.resolve({ action: "login" }) },
  );

  expect(response.status).toBe(401);
  expect((await response.json()).error.code).toBe("INVALID_CREDENTIALS");
  expect(response.headers.get("set-cookie")).toBeNull();
});
