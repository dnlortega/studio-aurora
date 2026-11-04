"use client";

import { CalendarDays } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

/**
 * Fronteira de erro do layout raiz: só dispara se o próprio `<html>` falhar,
 * então precisa renderizar a própria árvore e não pode depender de contexto de
 * tema, fonte ou Tailwind.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf7f1",
          color: "#2b1e18",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div style={{ maxWidth: "30rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.6rem", margin: "0 0 .6rem" }}>
            O estúdio não conseguiu abrir esta tela
          </h1>
          <p style={{ fontSize: ".9rem", lineHeight: 1.6, color: "#6c5548" }}>
            Tente novamente em alguns instantes. Nenhum horário é reservado sem
            a confirmação aparecer na sua tela.
          </p>
          {error.digest ? (
            <p style={{ fontSize: ".75rem", color: "#8a7566", marginTop: ".6rem" }}>
              Referência do erro: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              gap: ".5rem",
              justifyContent: "center",
              marginTop: "1.2rem",
            }}
          >
            <button
              type="button"
              onClick={reset}
              className={buttonVariants({ size: "sm" })}
            >
              Tentar novamente
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages
              -- esta é a fronteira de erro do próprio <html>: o roteador do
              Next pode estar quebrado aqui, então só um `<a>` de verdade
              garante que o clique recarregue a aplicação. */}
            <a href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <CalendarDays className="size-3.5" />
              Ir para a agenda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
