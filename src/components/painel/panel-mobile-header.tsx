import { CalendarPlus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { IconLink } from "@/components/shared/icon-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PanelMobileHeader({
  salonName,
  user,
}: {
  salonName: string;
  user: { name: string };
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-md lg:hidden">
      <Logo name={salonName} href="/painel" />

      <div className="flex items-center gap-2">
        <IconLink href="/" label="Agendar" size="icon-sm">
          <CalendarPlus className="size-4" />
        </IconLink>
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-[0.65rem] text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
