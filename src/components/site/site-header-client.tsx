"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, UserRound } from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { IconLink } from "@/components/shared/icon-button";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SiteHeaderUser = {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin";
};

/** O site é o agendamento: não há landing page nem âncoras de marketing. */
const links = [
  { href: "/", label: "Agendar" },
  { href: "/servicos", label: "Serviços" },
];

const bookingRoutes = ["/", "/agendar"];

export function SiteHeaderClient({
  salonName,
  user,
}: {
  salonName: string;
  user: SiteHeaderUser | null;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  /** Na tela de agendamento o botão CTA seria um link para a própria página. */
  const onBooking = bookingRoutes.includes(pathname);

  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo name={salonName} />

        {/* Em telas pequenas a navegação vive na barra fixa do rodapé
            (`SiteBottomNav`); aqui ficam apenas atalhos de conta. */}
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-1 lg:flex"
        >
          {links.map((link) => {
            const active =
              link.href === "/"
                ? bookingRoutes.includes(pathname)
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm transition-colors hover:text-foreground",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          {user ? (
            <>
              <IconLink
                href={isAdmin ? "/admin" : "/painel"}
                label={isAdmin ? "Painel do salão" : "Meu painel"}
                variant="ghost"
                size="icon-sm"
                tooltipSide="bottom"
              >
                <LayoutDashboard className="size-3.5" />
              </IconLink>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    buttonVariants({ variant: "outline", size: "icon-sm" }),
                  )}
                  aria-label="Menu da conta"
                  title="Menu da conta"
                >
                  <UserRound className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex flex-col gap-0.5">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem render={<Link href="/painel" />}>
                      <UserRound />
                      Meu painel
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/painel/perfil" />}>
                      Perfil e preferências
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <DropdownMenuItem render={<Link href="/admin" />}>
                        <LayoutDashboard />
                        Administração
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => {
                      startTransition(() => {
                        void logoutAction();
                      });
                    }}
                  >
                    <LogOut />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <IconLink
              href="/entrar"
              label="Entrar"
              variant="ghost"
              size="icon-sm"
              tooltipSide="bottom"
            >
              <LogIn className="size-3.5" />
            </IconLink>
          )}

          {onBooking ? null : (
            <Link
              href="/"
              className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
            >
              Reservar horário
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
