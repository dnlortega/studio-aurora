import { defineConfig, devices } from "@playwright/test";

import { loadEnvFile, resolveTestDatabaseUrl } from "./scripts/neon-test-db";

/**
 * Testes ponta a ponta contra uma instância real do Next.js usando o banco
 * `aurora_e2e` do projeto Neon — nunca o banco do salão e nunca um banco local.
 * O banco é zerado e re-migrado antes de cada execução.
 */
loadEnvFile(".env.local");
const e2eDatabaseUrl = resolveTestDatabaseUrl("e2e");
export default defineConfig({
  testDir: "./tests/e2e",
  // O banco agora é externo (Neon): cada página faz várias consultas e cada
  // consulta é uma ida pela rede. Os tempos do PGlite local não valem mais, e
  // em dev ainda soma a compilação on-demand de cada rota. 180s ficou curto
  // para os fluxos que atravessam site, painel e administração.
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
  webServer: {
    command:
      "node --import tsx scripts/require-no-dev-server.ts && npm run db:reset:e2e && npx next dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      DB_AUTO_MIGRATE: "false",
      NEXT_PUBLIC_APP_URL: "http://localhost:3100",
      AUTH_SECRET: "e2e-only-secret-nao-use-em-producao-aurora",
      RESEND_API_KEY: "",
      EMAIL_FROM: "Studio Aurora <agenda@studioaurora.local>",
    },
  },
});
