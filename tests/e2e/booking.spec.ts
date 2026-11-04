import { expect, test, type Page } from "@playwright/test";

import {
  brDate,
  E2E_USERS,
  login,
  pickOpenDay,
  salonToday,
} from "./helpers";

async function chooseServiceAndOpenDay(page: Page, targetDay: string) {
  await page.goto("/agendar");
  await page.getByRole("button", { name: /Manicure & esmaltação/ }).click();
  await page.getByRole("button", { name: "Escolher data" }).click();

  const targetMonth = targetDay.slice(0, 7);
  const currentMonth = salonToday().slice(0, 7);
  if (targetMonth !== currentMonth) {
    await page.locator("button.rdp-button_next").click();
  }

  const dayButton = page.locator(`[data-day="${brDate(targetDay)}"]`);
  await expect(dayButton).toBeEnabled();
  await dayButton.click();
  await expect(
    page.getByRole("heading", { name: "Horários disponíveis" }),
  ).toBeVisible();
}

test.describe("agendamento online", () => {
  test("fluxo completo: escolha, login sem perder seleção, confirmação e gestão pelo painel", async ({
    browser,
  }) => {
    // Três navegadores simultâneos + compilação on-demand das rotas do Next em
    // dev + consultas pela rede ao Neon: o fluxo inteiro passa de 4min, mas o
    // limite padrão de 180s não dá.
    test.setTimeout(300_000);

    const targetDay = pickOpenDay(3);
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    // 1) Serviços → data → horário → confirmação (ainda sem sessão).
    await chooseServiceAndOpenDay(clientPage, targetDay);
    await clientPage.getByRole("button", { name: "16:00", exact: true }).click();
    await expect(
      clientPage.getByRole("heading", { name: "Confirme os detalhes" }),
    ).toBeVisible();
    await expect(clientPage.getByText("Manicure & esmaltação").first()).toBeVisible();
    await expect(clientPage.getByText("R$ 55,00").first()).toBeVisible();

    // 2) Login no meio do fluxo; a seleção é restaurada.
    // O `next` vai codificado (`%2Fagendar`), então ancoramos só no prefixo.
    await clientPage.locator('a[href^="/entrar?next="]').click();
    await expect(clientPage).toHaveURL(/\/entrar\?next=/);
    await clientPage.locator("#email").fill(E2E_USERS.client.email);
    await clientPage.locator("#password").fill(E2E_USERS.client.password);
    await clientPage.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(clientPage).toHaveURL(/\/agendar/);
    await expect(
      clientPage.getByRole("heading", { name: "Confirme os detalhes" }),
    ).toBeVisible();
    await clientPage
      .getByRole("button", { name: "Confirmar agendamento" })
      .click();

    // 3) Confirmação só após gravação real no banco.
    await expect(
      clientPage.getByRole("heading", { name: "Horário reservado" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(clientPage.getByText("Manicure & esmaltação").first()).toBeVisible();

    await clientPage.getByRole("link", { name: /Ver agendamento/ }).click();
    await expect(clientPage).toHaveURL(/\/painel\/agendamentos\/[0-9a-f-]+/);
    await expect(clientPage.getByText("16:00", { exact: false }).first()).toBeVisible();
    await expect(clientPage.getByText("Manicure & esmaltação").first()).toBeVisible();

    // 4) O horário deixa de aparecer para outra pessoa (disponibilidade real).
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await chooseServiceAndOpenDay(otherPage, targetDay);
    await expect(
      otherPage.getByText("Horários exibidos já reservam o tempo total"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      otherPage.getByRole("button", { name: "16:00", exact: true }),
    ).toHaveCount(0);

    // 5) Administração enxerga o agendamento, altera o status e mantém histórico.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, E2E_USERS.admin, /\/admin$/);
    await adminPage.goto(
      `/admin/agendamentos?q=${encodeURIComponent(E2E_USERS.client.email)}`,
    );

    const row = adminPage
      .getByRole("row")
      .filter({ hasText: E2E_USERS.client.name })
      .filter({ hasText: "Manicure & esmaltação" });
    await expect(row).toBeVisible();
    await expect(row.getByText("R$ 55,00")).toBeVisible();

    await row.getByRole("button", { name: "Alterar status" }).click();
    await adminPage
      .getByRole("menuitem", { name: "Concluído", exact: true })
      .click();
    await expect(row.getByText("Concluído", { exact: true })).toBeVisible();

    await row
      .getByRole("link", { name: E2E_USERS.client.name, exact: true })
      .click();
    await expect(
      adminPage.getByRole("heading", { name: "Detalhes do agendamento" }),
    ).toBeVisible();
    await expect(adminPage.getByText("Manicure & esmaltação").first()).toBeVisible();
    await expect(adminPage.getByText("Agendamento criado").first()).toBeVisible();
    await expect(adminPage.getByText("Status: Concluído").first()).toBeVisible();

    // 6) A cliente vê o novo status no próprio painel. Concluído sai da lista
    // de "Próximos", então a consulta é no recorte que mostra tudo.
    await clientPage.goto("/painel/agendamentos?filtro=todos");
    await expect(
      clientPage.getByRole("heading", { name: "Meus agendamentos" }),
    ).toBeVisible();
    await expect(clientPage.getByText("Concluído").first()).toBeVisible();

    await clientContext.close();
    await otherContext.close();
    await adminContext.close();
  });
});
