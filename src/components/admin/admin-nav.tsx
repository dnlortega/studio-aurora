"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarCheck2,
  CalendarOff,
  CalendarRange,
  Clock3,
  LayoutDashboard,
  Scissors,
  Settings2,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const adminNavGroups = [
  {
    label: "Operação",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/agenda", label: "Agenda", icon: CalendarRange },
      {
        href: "/admin/agendamentos",
        label: "Agendamentos",
        icon: CalendarCheck2,
      },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/admin/clientes", label: "Clientes", icon: UsersRound },
      { href: "/admin/servicos", label: "Serviços", icon: Scissors },
    ],
  },
  {
    label: "Disponibilidade",
    items: [
      { href: "/admin/horarios", label: "Horários", icon: Clock3 },
      {
        href: "/admin/bloqueios",
        label: "Bloqueios e folgas",
        icon: CalendarOff,
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
      {
        href: "/admin/configuracoes",
        label: "Configurações",
        icon: Settings2,
      },
      {
        href: "/admin/status",
        label: "Status do sistema",
        icon: Activity,
      },
    ],
  },
] as const;

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação administrativa" className="flex flex-col gap-5">
      {adminNavGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground/80 uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
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
        </div>
      ))}
    </nav>
  );
}
