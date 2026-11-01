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
    "Agende cortes, coloração, manicure e cuidados de beleza no Studio Aurora. Escolha serviços, veja horários livres e confirme em poucos passos.",
  applicationName: "Studio Aurora",
  keywords: [
    "salão de beleza",
    "agendamento online",
    "cabelo",
    "manicure",
    "coloração",
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

export const dynamic = "force-dynamic";

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
