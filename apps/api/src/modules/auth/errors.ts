import { ApiError } from "../../lib/api-error";

/**
 * Erros do domínio auth (fábricas — cada chamada gera stack nova).
 */
export const InvalidCredentials = () =>
  new ApiError("INVALID_CREDENTIALS", 401, "Credenciais inválidas.");
export const AccountNotVerified = () =>
  new ApiError(
    "ACCOUNT_NOT_VERIFIED",
    401,
    "Confirme seu e-mail para continuar.",
  );
export const InvalidToken = () =>
  new ApiError("INVALID_TOKEN", 400, "Token inválido ou expirado.");
export const RateLimited = () =>
  new ApiError(
    "RATE_LIMITED",
    429,
    "Muitas tentativas. Tente novamente mais tarde.",
  );
export const Unauthenticated = () =>
  new ApiError(
    "UNAUTHENTICATED",
    401,
    "Sessão ausente, inválida ou encerrada.",
  );
