import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Leitor mínimo de `.env*` para o que roda fora do Next (Vitest, Playwright).
 * O Next já carrega `.env.local` sozinho; estas configurações precisam do
 * mesmo arquivo para descobrir a URL do PostgreSQL da Neon.
 */
export function parseEnvFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key) continue;
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

/** Variáveis do arquivo que ainda não existem no ambiente. */
export function envFileValues(file: string): Record<string, string> {
  const target = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  if (!existsSync(target)) return {};
  const current = process.env;
  const parsed = parseEnvFile(readFileSync(target, "utf8"));
  return Object.fromEntries(
    Object.entries(parsed).filter(([key, value]) => current[key] === undefined && value !== ""),
  );
}

/** Aplica o arquivo em `process.env` sem sobrescrever o que já foi definido. */
export function loadEnvFile(file = ".env.local"): void {
  Object.assign(process.env, envFileValues(file));
}

/** `host:banco` sem usuário e senha — seguro para imprimir no terminal. */
export function describeDatabaseTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}/${parsed.pathname.replace(/^\//, "")}`;
  } catch {
    return "url inválida";
  }
}
