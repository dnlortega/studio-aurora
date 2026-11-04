import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Rotas públicas indexáveis. `/` já é a tela de agendamento, então o atalho
 * `/agendar` fica fora do índice: ele tem `canonical` apontando para a raiz.
 * As datas são do momento da requisição — nada aqui é pré-renderizado, então o
 * índice reflete o catálogo atual assim que o salão altera um serviço.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${appUrl}/servicos`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];
}
