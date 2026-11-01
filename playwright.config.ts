import { defineConfig, devices } from "@playwright/test";

/**
 * Testes ponta a ponta contra uma instância real do Next.js usando um banco
 * PGlite isolado (.data/e2e). O banco é recriado antes de cada execução.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 12_000 },
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
    command: "npm run db:reset:e2e && npx next dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: "",
      PGLITE_DIR: ".data/e2e",
      E2E_PGLITE_DIR: ".data/e2e",
      DB_AUTO_MIGRATE: "true",
      NEXT_PUBLIC_APP_URL: "http://localhost:3100",
      AUTH_SECRET: "e2e-only-secret-nao-use-em-producao-aurora",
      RESEND_API_KEY: "",
      EMAIL_FROM: "Studio Aurora <agenda@studioaurora.local>",
    },
  },
});
