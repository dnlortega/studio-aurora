"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  UserPlus,
  UserRound,
} from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { IconButton, IconLink } from "@/components/shared/icon-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type SiteHeaderUser = {
  id: string;
  name: string;
  email: string;
  role: "client" | "admin";
};

const links = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/#sobre", label: "Sobre" },
  { href: "/#contato", label: "Contato" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function SiteHeaderClient({
  salonName,
  user,
}: {
  salonName: string;
  user: SiteHeaderUser | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo name={salonName} />

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-1 lg:flex"
        >
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href) && !link.href.includes("#");
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

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <IconLink
                href={isAdmin ? "/admin" : "/painel"}
                label={isAdmin ? "Painel do salão" : "Meu painel"}
                variant="ghost"
                size="icon-sm"
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
            <>
              <IconLink
                href="/entrar"
                label="Entrar"
                variant="ghost"
                size="icon-sm"
              >
                <LogIn className="size-3.5" />
              </IconLink>
              <IconLink href="/agendar" label="Agendar" size="icon-sm">
                <CalendarDays className="size-3.5" />
              </IconLink>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 lg:hidden">
          <IconLink href="/agendar" label="Agendar" size="icon-sm">
            <CalendarDays className="size-3.5" />
          </IconLink>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
          <SheetHeader className="border-b border-border/70 px-5 py-4">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Navegação do site
            </SheetDescription>
            <Logo name={salonName} />
          </SheetHeader>

          <div className="flex flex-col gap-1 px-4 py-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base text-foreground transition-colors hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-border/70 px-4 py-5">
            {user ? (
              <>
                <div className="mb-1 flex items-center gap-3 px-1">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
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
                <div className="flex items-center gap-2">
                  <IconLink
                    href={isAdmin ? "/admin" : "/painel"}
                    onClick={() => setOpen(false)}
                    label={isAdmin ? "Painel do salão" : "Meu painel"}
                    variant="outline"
                    tooltipSide="right"
                  >
                    <LayoutDashboard className="size-4" />
                  </IconLink>
                  <IconLink
                    href="/painel/perfil"
                    onClick={() => setOpen(false)}
                    label="Perfil"
                    variant="outline"
                    tooltipSide="right"
                  >
                    <UserRound className="size-4" />
                  </IconLink>
                  <IconButton
                    variant="ghost"
                    label="Sair"
                    tooltipSide="right"
                    disabled={pending}
                    onClick={() => {
                      setOpen(false);
                      startTransition(() => {
                        void logoutAction();
                      });
                    }}
                  >
                    <LogOut className="size-4" />
                  </IconButton>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <IconLink
                    href="/entrar"
                    onClick={() => setOpen(false)}
                    label="Entrar"
                    variant="outline"
                    tooltipSide="right"
                  >
                    <LogIn className="size-4" />
                  </IconLink>
                  <IconLink
                    href="/criar-conta"
                    onClick={() => setOpen(false)}
                    label="Criar conta"
                    tooltipSide="right"
                  >
                    <UserPlus className="size-4" />
                  </IconLink>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
