"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Scissors,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const panelNavItems = [
  { href: "/painel", label: "Visão geral", icon: LayoutDashboard },
  { href: "/painel/agendamentos", label: "Meus agendamentos", icon: CalendarDays },
  { href: "/painel/perfil", label: "Perfil e preferências", icon: UserRound },
  { href: "/servicos", label: "Catálogo", icon: Scissors },
] as const;

export function PanelNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação do painel" className="flex flex-col gap-1">
      {panelNavItems.map((item) => {
        const active =
          item.href === "/painel"
            ? pathname === "/painel"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
