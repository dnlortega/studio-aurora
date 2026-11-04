"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /**
   * Rotas que também devem acender este item. Usado pela tela de agendamento,
   * que existe em `/` e no atalho histórico `/agendar`.
   */
  activeOn?: readonly string[];
};

/**
 * Navegação fixa no rodapé em telas pequenas. Substitui o menu lateral
 * recolhido: fica sempre visível e rola na horizontal quando há muitos itens.
 */
export function BottomNav({
  label,
  items,
  children,
}: {
  label: string;
  items: readonly BottomNavItem[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 shadow-[0_-8px_30px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex w-full max-w-4xl items-stretch gap-0.5 overflow-x-auto px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.activeOn
            ? item.activeOn.includes(pathname)
            : item.href === "/admin" || item.href === "/painel"
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center text-[0.62rem] leading-[1.15] font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="max-w-full text-balance">{item.label}</span>
            </Link>
          );
        })}
        {children}
      </div>
    </nav>
  );
}
