import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /**
   * Sistema 100% sem cache — nada de servir resposta antiga.
   *
   * - `headers`: toda resposta sai com `Cache-Control: no-store`, incluindo
   *   HTML, RSC, `/api/*` e os artefatos compilados em `/_next/*`. Como o
   *   salão muda preços, horários e disponibilidade ao longo do dia, a
   *   preferência aqui é corretude: o navegador (e qualquer CDN na frente)
   *   sempre volta à origem.
   * - `experimental.staleTimes`: zera o cache de rotas do Client Router. Sem
   *   isso o Next guarda o payload de uma página por 30s e uma navegação pode
   *   mostrar agenda velha. `static` fica de fora porque o schema do Next exige
   *   `>= 30` para essa chave — e não há rota estática nenhuma no app: o layout
   *   raiz é `force-dynamic`, então nada é pré-renderizado no build.
   *
   * As páginas em si são forçadas a dinâmicas em `src/app/layout.tsx`
   * (`force-dynamic` + `force-no-store` + `revalidate = 0`), então não existe
   * shell estático gerado no build.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, max-age=0",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
    /**
     * Em dev o Next guarda as respostas dos Server Components entre recargas
     * por HMR. Desligado para que `npm run dev` também reflita o banco na hora.
     */
    serverComponentsHmrCache: false,
  },
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
