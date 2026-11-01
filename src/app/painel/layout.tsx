import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/painel/logout-button";
import { PanelBottomNav } from "@/components/painel/panel-bottom-nav";
import { PanelMobileHeader } from "@/components/painel/panel-mobile-header";
import { PanelNav } from "@/components/painel/panel-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireUser } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: "Meu painel",
    template: "%s · Meu painel · Studio Aurora",
  },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([requireUser("/painel"), getSettings()]);

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-border/70 bg-card/50 lg:flex">
        <div className="px-5 py-6">
          <Logo name={settings.salonName} />
        </div>

        <div className="px-3">
          <PanelNav />
        </div>

        <div className="mt-auto space-y-3 border-t border-border/70 p-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-background/70 px-2 py-2">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>

          {user.role === "admin" ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <LayoutDashboard className="size-3.5" />
              Ir para o painel administrativo
            </Link>
          ) : null}

          <LogoutButton
            variant="outline"
            className={cn("w-full justify-start text-sm")}
          />
          <p className="px-1 text-[0.65rem] leading-relaxed text-muted-foreground">
            Área do cliente. Seus agendamentos são visíveis apenas para você.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <PanelMobileHeader
          salonName={settings.salonName}
          user={{ name: user.name }}
        />
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-8 sm:pt-10 sm:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      <PanelBottomNav />
    </div>
  );
}
