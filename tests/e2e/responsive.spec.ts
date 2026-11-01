import { expect, test } from "@playwright/test";

import {
  E2E_USERS,
  expectNoHorizontalOverflow,
  login,
  logout,
} from "./helpers";

test.describe("responsividade mobile (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("site público sem rolagem horizontal", async ({ page }) => {
    for (const route of [
      "/",
      "/servicos",
      "/agendar",
      "/entrar",
      "/criar-conta",
      "/recuperar-senha",
    ]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("painel da cliente sem rolagem horizontal", async ({ page }) => {
    await login(page, E2E_USERS.client, /\/painel$/);

    for (const route of ["/painel", "/painel/agendamentos", "/painel/perfil"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("navegação fixa no rodapé do painel e do admin", async ({ page }) => {
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    await login(page, E2E_USERS.client, /\/painel$/);
    const panelNav = page.getByRole("navigation", {
      name: "Navegação do painel (rodapé)",
    });
    await expect(panelNav).toBeVisible();
    await expect(panelNav).toHaveCSS("position", "fixed");
    const panelBox = await panelNav.boundingBox();
    expect(panelBox).not.toBeNull();
    // Encostada no rodapé da janela, sempre visível.
    expect(panelBox!.y + panelBox!.height).toBeGreaterThanOrEqual(
      viewport!.height - 2,
    );
    await expect(
      panelNav.getByRole("link", { name: "Visão geral" }),
    ).toHaveAttribute("aria-current", "page");

    await logout(page);
    await login(page, E2E_USERS.admin, /\/admin$/);
    const adminNav = page.getByRole("navigation", {
      name: "Navegação administrativa (rodapé)",
    });
    await expect(adminNav).toBeVisible();
    await expect(adminNav).toHaveCSS("position", "fixed");
    await expect(
      adminNav.getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(adminNav.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  test("painel administrativo sem rolagem horizontal nas 9 seções", async ({
    page,
  }) => {
    await login(page, E2E_USERS.admin, /\/admin$/);

    for (const route of [
      "/admin",
      "/admin/agenda",
      "/admin/agendamentos",
      "/admin/clientes",
      "/admin/servicos",
      "/admin/horarios",
      "/admin/bloqueios",
      "/admin/relatorios",
      "/admin/configuracoes",
    ]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});

test.describe("responsividade tablet (768×1024)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("páginas principais sem rolagem horizontal", async ({ page }) => {
    for (const route of ["/", "/agendar", "/servicos"]) {
      await page.goto(route);
      await expectNoHorizontalOverflow(page);
    }

    await login(page, E2E_USERS.admin, /\/admin$/);
    for (const route of ["/admin", "/admin/agenda", "/admin/relatorios"]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});

test.describe("desktop (1280×900)", () => {
  test("navegação inferior dá lugar à lateral", async ({ page }) => {
    await login(page, E2E_USERS.admin, /\/admin$/);
    await expect(
      page.getByRole("navigation", {
        name: "Navegação administrativa (rodapé)",
      }),
    ).toBeHidden();
    await expect(
      page.getByRole("navigation", {
        name: "Navegação administrativa",
        exact: true,
      }),
    ).toBeVisible();
  });
});
