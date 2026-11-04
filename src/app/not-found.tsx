import Link from "next/link";
import { CalendarDays, Compass, Home } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 404 do app inteiro — inclusive `/admin/agendamentos/[id]` e clientes. */
export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60svh] items-center justify-center py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="eyebrow">Erro 404</p>
        <h1 className="font-heading text-3xl text-balance sm:text-4xl">
          Essa página não existe mais
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
          O endereço pode ter mudado ou o atendimento que você procurou foi
          removido. A agenda do estúdio continua aberta.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className={cn(buttonVariants(), "gap-2")}
            aria-label="Reservar um horário"
          >
            <CalendarDays className="size-4" />
            Reservar horário
          </Link>
          <Link
            href="/servicos"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            aria-label="Ver serviços e preços"
          >
            <Compass className="size-4" />
            Serviços
          </Link>
          <Link
            href="/painel"
            className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
            aria-label="Meus agendamentos"
          >
            <Home className="size-4" />
            Meus horários
          </Link>
        </div>
      </div>
    </div>
  );
}
