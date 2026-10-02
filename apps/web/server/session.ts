import "server-only";

import { cookies } from "next/headers";
import { getServerConfig } from "./config";

function sessionOptions() {
  const { secureCookies } = getServerConfig();
  return {
    name: secureCookies ? "__Host-mf_session" : "mf_session",
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function saveSession(token: string) {
  const store = await cookies();
  store.set({ ...sessionOptions(), value: token });
}

export async function clearSession() {
  const store = await cookies();
  store.set({ ...sessionOptions(), value: "", maxAge: 0 });
}
