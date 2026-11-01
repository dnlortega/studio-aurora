import { headers } from "next/headers";

/** Identificador aproximado do cliente para limitar tentativas. */
export async function requestIdentifier(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    store.get("x-real-ip") ||
    store.get("cf-connecting-ip") ||
    "local";
  return ip;
}

/** Só permite redirecionamentos internos. */
export function safeNextPath(
  next: string | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.startsWith("/entrar") || next.startsWith("/criar-conta")) {
    return fallback;
  }
  return next;
}
