import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Os fluxos de agenda (agendamento da cliente e remarcação do admin)
      // limpam a seleção anterior e religam o carregamento dos horários quando
      // a data ou os serviços mudam. Esse reset síncrono no início do efeito é
      // intencional: sem ele ficaria marcado um horário que não cabe na duração
      // nova. O aviso continua visível, mas não bloqueia a verificação.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos gerados por testes e pelo banco local de desenvolvimento.
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    ".data/**",
    "drizzle/**",
  ]),
]);

export default eslintConfig;
