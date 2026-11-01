import { expect, test } from "@playwright/test";

import {
  E2E_USERS,
  login,
  loginAsDev,
  logout,
} from "./helpers";

test.describe("autenticação e perfis", () => {
  test("cadastro público cria sempre uma conta de cliente", async ({ page }) => {
    const stamp = Date.now();
    const email = `nova.${stamp}@e2e.local`;

    await page.goto("/criar-conta");
    await page.locator("#name").fill("Nova Cliente E2E");
    await page.locator("#email").fill(email);
    await page.locator("#phone").fill("11966665555");
    await page.locator("#password").fill("NovaCliente123");
    await page.locator("#confirmPassword").fill("NovaCliente123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/painel$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /(Bom dia|Boa tarde|Boa noite), Nova/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Novo agendamento" }),
    ).toBeVisible();

    // Mesmo autenticada, a conta recém-criada não pode abrir a administração.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/painel\?aviso=sem-permissao/);
    await expect(
      page.getByText("Sua conta não tem acesso ao painel administrativo."),
    ).toBeVisible();
  });

  test("login, logout e acesso do administrador", async ({ page }) => {
    await login(page, E2E_USERS.client, /\/painel$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Cliente",
    );

    await logout(page);

    await login(page, E2E_USERS.admin, /\/admin$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /(Bom dia|Boa tarde|Boa noite), Aurora/,
      }),
    ).toBeVisible();

    const nav = page.getByRole("navigation", {
      name: "Navegação administrativa",
    });
    for (const label of [
      "Dashboard",
      "Agenda",
      "Agendamentos",
      "Clientes",
      "Serviços",
      "Horários",
      "Bloqueios e folgas",
      "Relatórios",
      "Configurações",
    ]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("credenciais inválidas não criam sessão", async ({ page }) => {
    await page.goto("/entrar");
    await page.locator("#email").fill(E2E_USERS.client.email);
    await page.locator("#password").fill("SenhaErrada999");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByText("E-mail ou senha inválidos.").first()).toBeVisible();
    await expect(page).toHaveURL(/\/entrar$/);

    await page.goto("/painel");
    await expect(page).toHaveURL(/\/entrar\?next=/);
  });

  test("recuperação de senha com link de desenvolvimento", async ({ page }) => {
    const newPassword = "OutroNova123";

    await page.goto("/recuperar-senha");
    await page.locator("#email").fill(E2E_USERS.otherClient.email);
    await page.getByRole("button", { name: "Enviar link de redefinição" }).click();

    await expect(
      page.getByText("Provedor de e-mail não configurado neste ambiente."),
    ).toBeVisible();
    await page.getByRole("link", { name: /Abrir link de redefinição/ }).click();

    await expect(page).toHaveURL(/\/redefinir-senha\?token=/);
    await page.locator("#password").fill(newPassword);
    await page.locator("#confirmPassword").fill(newPassword);
    await page.getByRole("button", { name: "Redefinir senha" }).click();

    await expect(page).toHaveURL(/\/entrar\?redefinida=1/);
    await expect(
      page.getByText("Senha redefinida com sucesso. Entre com sua nova senha."),
    ).toBeVisible();

    await login(
      page,
      { email: E2E_USERS.otherClient.email, password: newPassword },
      /\/painel$/,
    );

    // O link é de uso único: tokens inválidos caem na tela de link inválido.
    await page.goto("/redefinir-senha?token=token-invalido");
    await expect(
      page.getByRole("heading", { name: "Link inválido ou expirado" }),
    ).toBeVisible();
  });

  /**
   * Prova do requisito "não quero que apareça o login e senha na URL".
   *
   * Sem JavaScript o navegador usa o HTML puro entregue pelo servidor: o
   * formulário já nasce com `method="post"`, então as credenciais seguem no
   * corpo da requisição e a URL de destino continua limpa — nada fica no
   * histórico, nos logs do proxy ou no `Referer`.
   */
  test("envio sem JavaScript mantém as credenciais fora da URL", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/entrar");
    const method = await page.locator("form:has(#email)").getAttribute("method");
    expect(method?.toLowerCase()).toBe("post");

    const posts: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST") posts.push(request.url());
    });

    await page.locator("#email").fill(E2E_USERS.admin.email);
    await page.locator("#password").fill(E2E_USERS.admin.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page).toHaveURL(/\/admin$/);
    expect(posts.length).toBeGreaterThan(0);
    for (const url of posts) {
      expect(url).not.toContain("?");
      expect(url).not.toContain(E2E_USERS.admin.email.split("@")[0]);
      expect(url.toLowerCase()).not.toContain("password");
    }
    expect(page.url()).toBe("http://localhost:3100/admin");

    await context.close();
  });

  /**
   * Atalho de desenvolvimento da tela de login.
   *
   * O pedido foi "clicar e entrar com cada conta". Como as senhas existem no
   * banco apenas como hash irreversível, o atalho não mostra senha nenhuma: a
   * lista sai do banco (nome, e-mail, papel e tipo de hash) e o botão cria a
   * sessão no servidor. Em produção a seção nem é renderizada.
   */
  test("atalho 'Entrar como' abre o painel de cada conta sem senha", async ({
    page,
  }) => {
    await page.goto("/entrar");
    const section = page
      .locator("details")
      .filter({ hasText: "só em desenvolvimento" });
    await expect(section).toBeVisible();
    await section.locator("summary").click();

    for (const name of [
      E2E_USERS.admin.name,
      E2E_USERS.client.name,
      E2E_USERS.otherClient.name,
    ]) {
      await expect(
        section.getByRole("button", { name: `Entrar como ${name}` }),
      ).toBeVisible();
    }

    const html = await page.content();
    expect(html).toContain("hash:");
    expect(html).toContain(E2E_USERS.admin.email);
    for (const password of [
      E2E_USERS.admin.password,
      E2E_USERS.client.password,
      E2E_USERS.otherClient.password,
    ]) {
      expect(html, "senha não deve aparecer no HTML").not.toContain(password);
    }

    const urls: string[] = [];
    page.on("request", (request) => urls.push(request.url()));

    await section
      .getByRole("button", { name: `Entrar como ${E2E_USERS.admin.name}` })
      .click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Aurora/ }),
    ).toBeVisible();

    await logout(page);

    await loginAsDev(page, E2E_USERS.client.name, /\/painel$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Cliente/ }),
    ).toBeVisible();

    for (const url of urls) {
      expect(url.toLowerCase()).not.toContain("password");
      expect(url.toLowerCase()).not.toContain("senha");
      expect(url).not.toContain(E2E_USERS.admin.password);
    }
  });

  /**
   * A tela esconde o botão, mas a ação é uma rota pública: alguém pode enviar o
   * POST direto. Aqui a tentativa usa uma conta que não existe e precisa voltar
   * para a tela de login sem receber cookie de sessão.
   */
  test("POST forjado do atalho não cria sessão para conta inexistente", async ({
    page,
    request,
  }) => {
    await page.goto("/entrar");
    const html = await page.content();
    const actionId = html.match(
      /ml-auto[^>]*>\s*<input type="hidden" name="(\$ACTION_ID_[0-9a-f]+)"/,
    )?.[1];
    expect(actionId, "ação de desenvolvimento ausente no HTML").toBeTruthy();

    const response = await request.post("/entrar", {
      multipart: { [actionId as string]: "", email: "nao-existe@studioaurora.local" },
      maxRedirects: 0,
    });

    expect([302, 303, 307]).toContain(response.status());
    const location = response.headers()["location"] ?? "";
    expect(location).toContain("/entrar");
    expect(location).toContain("erro=dev");
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).not.toContain("aurora_sessao");
  });

  test("status do servidor é restrito ao administrador e não revela chaves", async ({
    page,
  }) => {
    await page.goto("/admin/status");
    await expect(page).toHaveURL(/\/entrar\?next=/);

    await login(page, E2E_USERS.client, /\/painel$/);
    await page.goto("/admin/status");
    await expect(page).toHaveURL(/\/painel\?aviso=sem-permissao/);
    await logout(page);

    await login(page, E2E_USERS.admin, /\/admin$/);
    await page.goto("/admin/status");
    await expect(
      page.getByRole("heading", { level: 1, name: "Status do servidor" }),
    ).toBeVisible();
    for (const section of [
      "Banco de dados",
      "Servidor",
      "Repositório",
      "Integrações e chaves",
    ]) {
      // Os títulos dos cartões não são headings; o `dt` com o mesmo texto
      // ("Repositório") existe, então ancoramos no slot do título.
      await expect(
        page.locator('[data-slot="card-title"]', { hasText: section }),
      ).toBeVisible();
    }
    await expect(page.getByText("AUTH_SECRET", { exact: true })).toBeVisible();

    const html = await page.content();
    expect(html).not.toContain("e2e-only-secret-nao-use-em-producao-aurora");
    expect(html).not.toContain(E2E_USERS.admin.password);
  });
});
