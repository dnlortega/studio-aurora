import { cn } from "@/lib/utils";

/**
 * Esqueleto genérico das áreas logadas (painel da cliente e administração).
 *
 * Assim como o `(site)/loading.tsx`, existe para a tela não saltar enquanto o
 * servidor lê o Neon. Ele só é usado dentro de `admin/` e `painel/`, nunca na
 * raiz do app — ver o comentário em `src/app/(site)/loading.tsx`.
 */
export function PageSkeleton({
  cards = 3,
  className,
  label = "Carregando",
}: {
  cards?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("space-y-5", className)}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}…</span>

      <div className="animate-pulse space-y-2">
        <div className="h-3 w-24 rounded-lg bg-muted-foreground/10" />
        <div className="h-7 w-56 rounded-lg bg-muted-foreground/10" />
      </div>

      <div className="animate-pulse space-y-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-border/70 bg-card p-4"
          >
            <div className="h-3.5 w-32 rounded-lg bg-muted-foreground/10" />
            <div className="h-3 w-2/3 rounded-lg bg-muted-foreground/10" />
            <div className="h-3 w-1/3 rounded-lg bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
