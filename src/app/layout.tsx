import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Studio Aurora — Agendamento online",
    template: "%s · Studio Aurora",
  },
  description:
    "Agende manicure, pedicure e unhas em gel no Studio Aurora. Escolha serviços, veja horários livres e confirme em poucos passos.",
  applicationName: "Studio Aurora",
  /**
   * Substitui a tag `<meta name="generator" content="Next.js …">` pela marca do
   * estúdio: o framework é detalhe de implementação de quem usa o site.
   */
  generator: "Studio Aurora",
  twitter: {
    card: "summary_large_image",
    title: "Studio Aurora — Agendamento online",
    description:
      "Escolha seus serviços, encontre o melhor horário e confirme em segundos.",
  },
  keywords: [
    "estúdio de unhas",
    "agendamento online",
    "manicure",
    "pedicure",
    "unhas em gel",
    "esmaltação",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Studio Aurora — Agendamento online",
    description:
      "Escolha seus serviços, encontre o melhor horário e agende em segundos.",
    siteName: "Studio Aurora",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f1",
  width: "device-width",
  initialScale: 1,
};

/**
 * Nada de cache. Cada visita renderiza a página do zero, lendo o Neon naquele
 * instante: nenhuma rota é pré-renderizada no build, nenhuma resposta de
 * `fetch` é guardada e nenhuma revalidação temporada existe no app.
 *
 * `force-dynamic` já equivale a `fetchCache: "force-no-store"` +
 * `revalidate: 0`; os três aparecem juntos para que a intenção fique explícita
 * e continue verdadeira se algum segmento mudar de configuração.
 *
 * A configuração se propaga para layouts e páginas filhos. Rotas de API são
 * segmentos separados e declaram a própria política em `src/app/api/**`.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${fraunces.variable} h-full`}
    >
      <body className="flex min-h-svh flex-col bg-background">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
