import type { MetadataRoute } from "next";

/**
 * Identidade do app instalável (Add to Tela de Início). As cores acompanham o
 * tema do site (`src/app/globals.css`) para que o ícone não pareça de outro
 * produto.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studio Aurora — Agendamento de unhas",
    short_name: "Aurora",
    description:
      "Agende manicure, pedicure e unhas em gel com horários reais e confirmação em poucos passos.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf7f1",
    theme_color: "#8c4a35",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["beauty", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
