/**
 * Esqueleto enquanto o servidor lê o Neon. Cada página é dinâmica, então este
 * estado aparece em navegações lentas — o formato imita a tela de agendamento
 * para a página não "pular" quando o conteúdo chega.
 *
 * Fica no segmento `(site)` e não na raiz de propósito: um `loading.tsx` na
 * raiz cria uma borda de Suspense em toda rota, e o React entrega o conteúdo
 * suspenso dentro de `<div hidden>`, revelado por um script. Sem JavaScript o
 * script nunca roda — a pessoa ficaria olhando o esqueleto e não conseguiria
 * nem entrar na conta. As rotas de autenticação continuam sem borda.
 */
export default function Loading() {
  return (
    <div className="container-page space-y-7 py-10" aria-busy="true">
      <div className="animate-pulse space-y-4 rounded-3xl border border-border/70 bg-secondary/40 px-6 py-8">
        <div className="h-4 w-28 rounded-lg bg-muted-foreground/10" />
        <div className="h-8 w-2/3 rounded-lg bg-muted-foreground/10" />
        <div className="h-4 w-1/2 rounded-lg bg-muted-foreground/10" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded-lg bg-muted-foreground/10" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 rounded-xl border border-border/70 bg-card"
              />
            ))}
          </div>
        </div>
        <div className="hidden h-64 animate-pulse rounded-2xl border border-border/70 bg-card lg:block" />
      </div>

      <p className="sr-only" role="status">
        Carregando a agenda do estúdio…
      </p>
    </div>
  );
}
