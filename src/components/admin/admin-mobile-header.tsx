import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AdminMobileHeader({
  salonName,
  userName,
}: {
  salonName: string;
  userName: string;
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
      <Logo name={salonName} href="/admin" />
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-xs font-medium">{userName}</span>
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 text-[0.65rem] text-primary">
            {initials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
