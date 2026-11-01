import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /**
   * Quando o app é aberto pelo IP da rede local (celular, tablet, outro note),
   * o Next bloqueia o HMR entre origens por padrão. O sintoma é discreto e bem
   * traiçoeiro: a página continua servindo o HTML antigo — inclusive formulários
   * que já foram corrigidos — e nada muda até o navegador ser recarregado à mão.
   * `DEV_ORIGINS` aceita uma lista separada por vírgula.
   */
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? "172.20.187.11")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  serverExternalPackages: ["postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
