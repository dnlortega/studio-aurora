"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Fronteira de erro do app. Mostra o que aconteceu em português e permite
 * tentar de novo — nunca um stack trace cru do React.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-page flex min-h-[60svh] items-center justify-center py-16">
      <div className="surface-card w-full max-w-lg space-y-4 p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-5" />
        </span>
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl">Algo saiu do lugar</h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            A página não pôde ser montada agora. Nenhum agendamento foi
            registrado por engano: tente novamente e, se persistir, avise o
            salão pelo WhatsApp.
          </p>
        </div>

        {error.message ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {error.message}
            {error.digest ? ` (ref. ${error.digest})` : ""}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={reset} size="sm" className="gap-2">
            Tentar novamente
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/" />}>
            Voltar para a agenda
          </Button>
        </div>
      </div>
    </div>
  );
}
