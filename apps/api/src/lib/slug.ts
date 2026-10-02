/**
 * Normalização de slug para URL (issue #216):
 * minúsculas, sem acentos, espaços/inválidos → hífen único.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** E-mail é case-insensitive na prática: normalizamos no limite do domínio. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
