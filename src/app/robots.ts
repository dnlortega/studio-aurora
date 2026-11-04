import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  .replace(/\/$/, "")
  .replace(/^https?:\/\//, "");

/**
 * Política de robôs do Studio Aurora: o catálogo público pode ser indexado;
 * contas, agenda e painéis privados não.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/painel", "/api", "/entrar", "/criar-conta"],
      },
    ],
    sitemap: `https://${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
