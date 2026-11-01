import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

export async function requireUser(next = "/painel"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }
  return user;
}

export async function requireAdmin(
  next = "/admin",
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(next)}`);
  }
  if (user.role !== "admin") {
    redirect("/painel?aviso=sem-permissao");
  }
  return user;
}
