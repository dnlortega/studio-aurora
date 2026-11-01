import path from "node:path";
import { defineConfig } from "vitest/config";

import { envFileValues } from "./scripts/load-env";

/**
 * Os testes de integração conversam com o PostgreSQL da Neon (banco
 * `aurora_test`), então precisam da mesma `DATABASE_URL` do aplicativo. O
 * Vitest não lê `.env.local` sozinho — quem lê é o Next.
 */
const localEnv = envFileValues(".env.local");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
    env: localEnv,
  },
});
