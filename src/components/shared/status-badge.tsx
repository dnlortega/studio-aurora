import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/db/schema";

export const statusConfig: Record<
  Appointment["status"],
  { label: string; className: string; dot: string }
> = {
  pending: {
    label: "Pendente",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Concluído",
    className: "border-stone-200 bg-stone-100 text-stone-700",
    dot: "bg-stone-500",
  },
  cancelled: {
    label: "Cancelado",
    className: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  no_show: {
    label: "Não compareceu",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: Appointment["status"];
  className?: string;
}) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 border font-medium", config.className, className)}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}
