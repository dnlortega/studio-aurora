import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "positive" | "warning" | "negative";
}) {
  return (
    <Card size="sm" className="border-0 ring-1 ring-foreground/10">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading text-2xl leading-tight">{value}</p>
          {hint ? (
            <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full",
            tone === "default" && "bg-secondary text-muted-foreground",
            tone === "positive" && "bg-emerald-50 text-emerald-700",
            tone === "warning" && "bg-amber-50 text-amber-700",
            tone === "negative" && "bg-rose-50 text-rose-700",
          )}
        >
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}
