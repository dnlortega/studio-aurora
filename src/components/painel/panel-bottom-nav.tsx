"use client";

import { panelNavItems } from "@/components/painel/panel-nav";
import { LogoutButton } from "@/components/painel/logout-button";
import { BottomNav, type BottomNavItem } from "@/components/shared/bottom-nav";

const items: BottomNavItem[] = panelNavItems.map((item) => ({
  href: item.href,
  label: item.label,
  icon: item.icon,
}));

export function PanelBottomNav() {
  return (
    <BottomNav label="Navegação do painel (rodapé)" items={items}>
      <LogoutButton
        variant="ghost"
        label="Sair"
        className="h-auto min-w-[4.25rem] flex-1 flex-col gap-1 rounded-lg px-2 py-2 text-[0.62rem] leading-tight font-medium text-muted-foreground"
      />
    </BottomNav>
  );
}
