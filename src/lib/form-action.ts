import type { ActionResult } from "@/lib/action-result";

/**
 * Helpers para ações de formulário (`<form action={serverAction}>`).
 *
 * Os formulários do sistema também funcionam antes da hidratação do React:
 * quando o `action` é uma função de servidor, o React já renderiza o HTML com
 * `method="POST"` e `enctype="multipart/form-data"`. Sem essa ligação, o
 * navegador enviaria GET e dados pessoais — e-mail e senha inclusive —
 * apareceriam na URL, no histórico e nos logs do servidor.
 */

export function formDataValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/**
 * Código curto e estável para a query string. Os nomes das mensagens nunca
 * vão para a URL: o que aparece lá é apenas esta classificação.
 */
export function formErrorCode(result: ActionResult): string {
  if (result.ok) return "";
  const message = result.message.toLowerCase();
  if (result.fieldErrors?.email?.toLowerCase().includes("já está cadastrado")) {
    return "cadastrado";
  }
  if (message.includes("muitas")) return "limite";
  if (message.includes("inválidos")) return "credenciais";
  if (message.includes("senha atual")) return "senha-atual";
  if (message.includes("sessão")) return "sessao";
  if (message.includes("inválido") || message.includes("expirou")) {
    return "token";
  }
  return "dados";
}

export function withNext(path: string, next?: string) {
  if (!next) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(next)}`;
}
