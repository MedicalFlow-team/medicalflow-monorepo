import { createHash, randomBytes } from "node:crypto";

/**
 * Tokens de uso único (#207/#209).
 * O valor em texto plano só existe no e-mail; o banco guarda o SHA-256.
 * Token URL-safe: 32 bytes de entropia.
 */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
