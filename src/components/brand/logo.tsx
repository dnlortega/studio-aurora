import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  name = "Studio Aurora",
  href = "/",
  className,
  light = false,
}: {
  name?: string;
  href?: string;
  className?: string;
  light?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={`${name} — página inicial`}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full border transition-colors",
          light
            ? "border-white/35 bg-white/10 text-white"
            : "border-primary/25 bg-primary/[0.06] text-primary",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="size-5"
        >
          <path
            d="M5 19 12 4.5 19 19"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.2 13.6h7.6"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="8.2" r="1.1" fill="currentColor" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading text-lg font-medium tracking-tight",
            light ? "text-white" : "text-foreground",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "mt-1 text-[0.55rem] uppercase tracking-[0.28em]",
            light ? "text-white/65" : "text-muted-foreground",
          )}
        >
          beleza & cuidado
        </span>
      </span>
    </Link>
  );
}
