import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminMobileHeader } from "@/components/admin/admin-mobile-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/painel/logout-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: {
    default: "Administração",
    template: "%s · Administração · Studio Aurora",
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([
    requireAdmin("/admin"),
    getSettings(),
  ]);

  return (
    <div className="min-h-svh bg-muted/30 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-border/70 bg-card lg:flex">
        {/* Em uma coluna só: ao lado do nome o selo "Admin" espremia a
            marca e o nome aparecia cortado ("Studio Auro…"). */}
        <div className="space-y-2.5 px-5 py-5">
          <Logo name={settings.salonName} href="/admin" />
          <Badge
            variant="outline"
            className="flex w-fit gap-1 border-primary/25 bg-primary/5 text-[0.6rem] text-primary"
          >
            <ShieldCheck className="size-3" />
            Admin
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <AdminNav />
        </div>

        <div className="space-y-3 border-t border-border/70 p-4">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-2 py-2">
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

          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowUpRight className="size-3.5" />
            Ver site público
          </Link>

          <LogoutButton
            label="Sair"
            variant="outline"
            className="w-full justify-start text-sm"
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <AdminMobileHeader
          salonName={settings.salonName}
          userName={user.name}
        />
        <main className="flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pt-8 sm:pb-10 xl:px-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <AdminBottomNav />
    </div>
  );
}
