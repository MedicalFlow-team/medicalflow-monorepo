import { NextResponse } from "next/server";

const allowedActions = new Set([
  "register",
  "verify-email",
  "resend-verification",
  "login",
  "forgot-password",
  "reset-password",
]);

function apiBaseUrl(): string {
  return (
    process.env.API_INTERNAL_URL ??
    (process.env.NODE_ENV === "production"
      ? "http://medflow_api:3000/api"
      : "http://127.0.0.1:3001/api")
  ).replace(/\/$/, "");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!allowedActions.has(action)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Recurso não encontrado." } },
      { status: 404 },
    );
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Envie dados JSON." } },
      { status: 400 },
    );
  }

  try {
    const body = await request.text();
    if (body.length > 10_000) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "Dados muito grandes." },
        },
        { status: 400 },
      );
    }
    const upstream = await fetch(`${apiBaseUrl()}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data: unknown = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }

    if (action === "login") {
      if (
        !data ||
        typeof data !== "object" ||
        !("token" in data) ||
        typeof data.token !== "string"
      ) {
        throw new Error("Resposta de login sem token.");
      }
      const { token, ...session } = data;
      const response = NextResponse.json(session, {
        headers: { "Cache-Control": "no-store" },
      });
      response.cookies.set(
        process.env.NODE_ENV === "production"
          ? "__Host-mf_session"
          : "mf_session",
        token,
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        },
      );
      return response;
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "Serviço indisponível. Tente novamente.",
        },
      },
      { status: 502 },
    );
  }
}
