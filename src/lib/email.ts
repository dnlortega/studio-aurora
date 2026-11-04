export type EmailResult =
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

/**
 * Envio transacional via Resend.
 *
 * Sem RESEND_API_KEY o sistema é honesto: retorna `not_configured` e a
 * notificação fica registrada como não enviada — nada é simulado como enviado.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { status: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          process.env.EMAIL_FROM ??
          "Studio Aurora <agenda@studioaurora.com.br>",
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        status: "failed",
        error: `Resend ${response.status}: ${body.slice(0, 300)}`,
      };
    }

    return { status: "sent" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Falha de rede",
    };
  }
}

export function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
