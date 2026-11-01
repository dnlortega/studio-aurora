import { expect, type Page } from "@playwright/test";

/** Credenciais criadas por scripts/reset-e2e.ts (nunca usadas em produção). */
export const E2E_USERS = {
  admin: {
    name: "Aurora Admin",
    email: "admin.e2e@studioaurora.local",
    password: "AuroraAdmin123",
  },
  client: {
    name: "Cliente Teste",
    email: "cliente.e2e@studioaurora.local",
    password: "ClienteE2e123",
  },
  otherClient: {
    name: "Outro Cliente",
    email: "outro.e2e@studioaurora.local",
    password: "OutroE2e123",
  },
} as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Data de hoje no fuso do salão, no formato YYYY-MM-DD. */
export function salonToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayOfIso(iso: string): number {
  return new Date(`${iso}T12:00:00.000Z`).getUTCDay();
}

/**
 * Escolhe um dia futuro que o salão abre por padrão (terça a sábado) e que
 * respeita a antecedência mínima configurada.
 */
export function pickOpenDay(minOffset = 3): string {
  const today = salonToday();
  for (let offset = minOffset; offset < minOffset + 14; offset += 1) {
    const day = addDaysIso(today, offset);
    const weekday = weekdayOfIso(day);
    if (weekday >= 2 && weekday <= 6) return day;
  }
  throw new Error("Nenhum dia aberto encontrado na janela de teste.");
}

/** Formato usado pelo atributo data-day do calendário (pt-BR). */
export function brDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${pad(day)}/${pad(month)}/${year}`;
}

export async function login(
  page: Page,
  credentials: { email: string; password: string },
  expectedUrl: RegExp,
) {
  await page.goto("/entrar");
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(expectedUrl);
}

export async function logout(page: Page) {
  const direct = page.getByRole("button", { name: "Sair", exact: true });
  if ((await direct.count()) > 0) {
    await direct.first().click();
  } else {
    await page.getByRole("button", { name: "Menu da conta" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
  }
  await expect(page).toHaveURL(/\/$/);
}

/** Garante que a página não cria rolagem horizontal (mobile/tablet). */
export async function expectNoHorizontalOverflow(page: Page) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(400);
  const measurements = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    measurements.scrollWidth,
    `Rolagem horizontal: ${measurements.scrollWidth}px > ${measurements.clientWidth}px`,
  ).toBeLessThanOrEqual(measurements.clientWidth + 1);
}
