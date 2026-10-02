import { sign, verify } from "jsonwebtoken";

/**
 * Sessão (#192/#208): JWT opaco contendo o ID da Session no banco.
 *
 * - TTL finito e curto (proibido JWT sem expiração);
 * - Revogação = apontar revokedAt na Session; o JWT deixa de resolver
 *   para uma sessão viva e é recusado.
 * - jsonwebtoken em vez de @elysiajs/jwt: o sign/verify vive no service
 *   (regra de negócio), não no ciclo HTTP — mantém o módulo testável.
 */
export interface SessionClaims {
  sid: string;
  sub: string;
}

export function signSessionToken(
  claims: SessionClaims,
  secret: string,
  ttlSeconds: number,
): string {
  return sign({ sid: claims.sid }, secret, {
    subject: claims.sub,
    expiresIn: ttlSeconds,
  });
}

export function verifySessionToken(
  token: string,
  secret: string,
): SessionClaims | null {
  try {
    const payload = verify(token, secret);
    if (typeof payload === "string") return null;
    const { sid, sub } = payload as { sid?: unknown; sub?: unknown };
    if (typeof sid !== "string" || typeof sub !== "string") return null;
    return { sid, sub };
  } catch {
    return null;
  }
}
