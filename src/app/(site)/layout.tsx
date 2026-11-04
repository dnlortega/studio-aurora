import { SiteBottomNav } from "@/components/site/site-bottom-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {/* Espaço do menu inferior fixo: nada do rodapé fica escondido atrás dele. */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+4.25rem)] lg:pb-0">
        <SiteFooter />
      </div>
      <SiteBottomNav />
    </div>
  );
}
