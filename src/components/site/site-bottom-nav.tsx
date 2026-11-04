"use client";

import { CalendarCheck, CalendarDays, ListChecks } from "lucide-react";

import { BottomNav, type BottomNavItem } from "@/components/shared/bottom-nav";

/**
 * Navegação do site no celular: sempre a barra fixa do rodapé, igual ao painel
 * do salão e ao painel do cliente. Não existe menu lateral nem gaveta em telas
 * pequenas — e não existe landing page: "Agendar" é a página inicial.
 *
 * "Meus horários" leva a `/painel`; sem sessão o painel redireciona para o
 * login com `next=/painel`, então o atalho funciona para quem está dentro e
 * para quem ainda não entrou.
 */
const items: BottomNavItem[] = [
  {
    href: "/",
    label: "Agendar",
    icon: CalendarDays,
    activeOn: ["/", "/agendar"],
  },
  { href: "/servicos", label: "Serviços", icon: ListChecks },
  { href: "/painel", label: "Meus horários", icon: CalendarCheck },
];

export function SiteBottomNav() {
  return <BottomNav label="Navegação do site (rodapé)" items={items} />;
}
