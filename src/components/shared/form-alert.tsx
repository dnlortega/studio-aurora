import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type FormAlertTone = "error" | "success" | "info";

const tones: Record<
  FormAlertTone,
  { wrapper: string; icon: React.ElementType; role: "alert" | "status" }
> = {
  error: {
    wrapper: "border-rose-200 bg-rose-50/80 text-rose-800",
    icon: AlertTriangle,
    role: "alert",
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    icon: CheckCircle2,
    role: "status",
  },
  info: {
    wrapper: "border-border bg-muted/40 text-muted-foreground",
    icon: Info,
    role: "status",
  },
};

/** Aviso renderizado no servidor — usado quando a ação volta pela URL. */
export function FormAlert({
  tone = "info",
  message,
  className,
}: {
  tone?: FormAlertTone;
  message: React.ReactNode;
  className?: string;
}) {
  const config = tones[tone];
  const Icon = config.icon;
  return (
    <div
      role={config.role}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3.5 text-sm",
        config.wrapper,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p className="text-pretty">{message}</p>
    </div>
  );
}
