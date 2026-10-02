import { type NextRequest, NextResponse } from "next/server";

const sessionCookieNames = ["mf_session", "__Host-mf_session"] as const;

function hasSessionCookie(request: NextRequest): boolean {
  return sessionCookieNames.some((name) => request.cookies.has(name));
}

const authRoutes = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/select-organization"
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = hasSessionCookie(request);

  if (authRoutes.has(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const returnTo = `${pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set("returnTo", returnTo);
  return isProtectedRoute(pathname)
    ? NextResponse.redirect(loginUrl)
    : NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/onboarding/:path*",
    "/select-organization",
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
  ],
};
