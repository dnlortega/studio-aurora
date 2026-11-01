"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataValues,
  formErrorCode,
  withNext,
} from "@/lib/form-action";
import { getDb } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "@/lib/auth/password";
import {
  createSession,
  destroyCurrentSession,
  getCurrentUser,
  revokeAllSessions,
} from "@/lib/auth/session";
import {
  findPasswordResetToken,
  issuePasswordResetToken,
  markPasswordResetTokenUsed,
} from "@/lib/auth/reset";
import { sendEmail, appUrl } from "@/lib/email";
import { rateLimit, rateLimitKey, resetRateLimit } from "@/lib/rate-limit";
import { requestIdentifier, safeNextPath } from "@/lib/request";
import {
  changePasswordSchema,
  flattenFieldErrors,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validation/schemas";

function normalizePhone(phone?: string) {
  return phone && phone.length > 0 ? phone : null;
}

/**
 * Comparação de e-mail ignorando maiúsculas. O índice único da tabela é
 * `lower(email)`, então toda leitura precisa usar a mesma regra — senão uma
 * conta gravada como "Ana@X.com" escaparia da verificação de duplicidade.
 */
function emailMatches(email: string) {
  return sql`lower(${users.email}) = ${email.trim().toLowerCase()}`;
}

export async function signupAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Revise os dados informados.",
      flattenFieldErrors(parsed.error),
    );
  }

  const identifier = await requestIdentifier();
  const limit = rateLimit(rateLimitKey("signup", identifier), {
    limit: 6,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return fail(
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    );
  }

  const { name, email, phone, password, next } = parsed.data;
  const db = await getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(emailMatches(email))
    .limit(1);

  if (existing[0]) {
    return fail(
      "Este e-mail já está cadastrado. Entre na sua conta ou recupere a senha.",
      { email: "Este e-mail já está cadastrado." },
    );
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const inserted = await db
      .insert(users)
      .values({
        name,
        email,
        phone: normalizePhone(phone),
        passwordHash,
        role: "client",
      })
      .returning({ id: users.id });
    userId = inserted[0].id;
  } catch (error) {
    // Corrida entre duas contas novas com o mesmo e-mail: o índice único
    // `lower(email)` decide. A mensagem deixa claro o que aconteceu.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return fail(
        "Este e-mail já está cadastrado. Entre na sua conta ou recupere a senha.",
        { email: "Este e-mail já está cadastrado." },
      );
    }
    return fail("Não foi possível criar a conta. Tente novamente.");
  }

  await createSession(userId);
  redirect(safeNextPath(next, "/painel"));
}

export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Preencha e-mail e senha.", flattenFieldErrors(parsed.error));
  }

  const { email, password, next } = parsed.data;
  const identifier = await requestIdentifier();
  const limit = rateLimit(rateLimitKey("login", `${identifier}:${email}`), {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return fail(
      "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
    );
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(emailMatches(email))
    .limit(1);
  const user = rows[0];

  if (!user || !user.isActive) {
    return fail("E-mail ou senha inválidos.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return fail("E-mail ou senha inválidos.");
  }

  // Contas migradas do sistema anterior usam bcrypt; troca para scrypt.
  if (needsPasswordRehash(user.passwordHash)) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }

  resetRateLimit(rateLimitKey("login", `${identifier}:${email}`));
  await createSession(user.id);
  const fallback = user.role === "admin" ? "/admin" : "/painel";
  redirect(safeNextPath(next, fallback));
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/");
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<ActionResult<{ previewUrl?: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Informe um e-mail válido.", flattenFieldErrors(parsed.error));
  }

  const identifier = await requestIdentifier();
  const limit = rateLimit(rateLimitKey("forgot", identifier), {
    limit: 5,
    windowMs: 30 * 60 * 1000,
  });
  if (!limit.allowed) {
    return fail("Muitas solicitações. Aguarde alguns minutos.");
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(emailMatches(parsed.data.email))
    .limit(1);
  const user = rows[0];

  const genericMessage =
    "Se este e-mail estiver cadastrado, enviaremos um link para redefinir a senha.";

  if (!user || !user.isActive) {
    return ok(genericMessage);
  }

  const { token } = await issuePasswordResetToken(user.id);
  const resetUrl = appUrl(`/redefinir-senha?token=${token}`);

  const result = await sendEmail({
    to: user.email,
    subject: "Redefinição de senha — Studio Aurora",
    text: `Acesse ${resetUrl} para criar uma nova senha. O link expira em 1 hora.`,
    html: `
      <div style="font-family:Georgia,serif;background:#f7f2ea;padding:32px;color:#2c2621">
        <div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #e8dfd2;border-radius:16px;padding:32px">
          <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#9a7b5f;margin:0 0 8px">Studio Aurora</p>
          <h1 style="font-size:24px;margin:0 0 16px">Redefinir sua senha</h1>
          <p>Recebemos um pedido para redefinir a senha da sua conta.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#6d4c41;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Criar nova senha</a></p>
          <p style="font-size:13px;color:#6b5f55">O link expira em 1 hora. Se você não solicitou, ignore esta mensagem.</p>
        </div>
      </div>`,
  });

  if (result.status === "not_configured") {
    // Ambiente sem provedor de e-mail: mostramos o link apenas fora de produção,
    // deixando explícito que nenhum e-mail foi enviado.
    return ok(genericMessage, {
      previewUrl: process.env.NODE_ENV === "production" ? undefined : resetUrl,
    });
  }

  if (result.status === "failed") {
    console.error("[forgot-password] falha ao enviar e-mail:", result.error);
    return ok(genericMessage);
  }

  return ok(genericMessage);
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Revise os dados informados.",
      flattenFieldErrors(parsed.error),
    );
  }

  const identifier = await requestIdentifier();
  if (
    !rateLimit(rateLimitKey("reset", identifier), {
      limit: 10,
      windowMs: 30 * 60 * 1000,
    }).allowed
  ) {
    return fail("Muitas tentativas. Aguarde alguns minutos.");
  }

  const tokenRow = await findPasswordResetToken(parsed.data.token);
  if (!tokenRow) {
    return fail("Este link é inválido ou expirou. Solicite um novo link.");
  }

  const db = await getDb();
  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, tokenRow.userId));

  await markPasswordResetTokenUsed(tokenRow.id);
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, tokenRow.userId));
  await revokeAllSessions(tokenRow.userId);

  redirect("/entrar?redefinida=1");
}

export async function changePasswordAction(
  input: unknown,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Sessão expirada. Entre novamente.");

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Revise os dados informados.",
      flattenFieldErrors(parsed.error),
    );
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    return fail("Senha atual incorreta.", {
      currentPassword: "Senha atual incorreta.",
    });
  }

  const db = await getDb();
  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  await revokeAllSessions(user.id);
  await createSession(user.id);
  revalidatePath("/painel/perfil");
  revalidatePath("/admin/configuracoes");

  return ok("Senha alterada com sucesso.");
}

/**
 * Ações em formato de formulário (`<form action={serverAction}>`).
 *
 * Os formulários de acesso também funcionam antes da hidratação do React e com
 * JavaScript desativado. Sem isso o navegador submeteria um GET e o e-mail —
 * junto com a senha — apareceria na URL, no histórico e nos logs. Com POST os
 * dados seguem no corpo da requisição e as falhas voltam apenas como um código
 * na query string, que as páginas traduzem para o usuário.
 */
export async function loginFormAction(formData: FormData): Promise<void> {
  const values = formDataValues(formData);
  const result = await loginAction(values);
  redirect(withNext(`/entrar?erro=${formErrorCode(result)}`, values.next));
}

export async function signupFormAction(formData: FormData): Promise<void> {
  const values = formDataValues(formData);
  const result = await signupAction(values);
  redirect(withNext(`/criar-conta?erro=${formErrorCode(result)}`, values.next));
}

export async function forgotPasswordFormAction(
  formData: FormData,
): Promise<void> {
  const result = await forgotPasswordAction(formDataValues(formData));
  if (result.ok) {
    redirect("/recuperar-senha?enviado=1");
  }
  redirect(`/recuperar-senha?erro=${formErrorCode(result)}`);
}

export async function resetPasswordFormAction(
  formData: FormData,
): Promise<void> {
  const values = formDataValues(formData);
  const result = await resetPasswordAction(values);
  redirect(
    `/redefinir-senha?erro=${formErrorCode(result)}&token=${encodeURIComponent(
      values.token ?? "",
    )}`,
  );
}
