"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { changeStatusAction } from "@/actions/admin";
import { StatusBadge, statusConfig } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Appointment } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const STATUSES: Appointment["status"][] = [
  "pending",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
];

export function QuickStatus({
  appointmentId,
  status,
  compact = false,
}: {
  appointmentId: string;
  status: Appointment["status"];
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(next: Appointment["status"]) {
    if (next === status) return;
    startTransition(async () => {
      const result = await changeStatusAction({
        appointmentId,
        status: next,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Status atualizado para ${statusConfig[next].label.toLowerCase()}.`);
      router.refresh();
    });
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <StatusBadge status={status} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                aria-label="Alterar status"
                title="Alterar status"
                disabled={pending}
              />
            }
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Flag className="size-3.5" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUSES.map((option) => (
                <DropdownMenuItem
                  key={option}
                  disabled={option === status || pending}
                  onClick={() => handleChange(option)}
                  className="gap-2"
                >
                  <span
                    className={cn("size-2 rounded-full", statusConfig[option].dot)}
                  />
                  {statusConfig[option].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Status</p>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Alterar status"
                title="Alterar status"
                disabled={pending}
              />
            }
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Flag className="size-4" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {STATUSES.map((option) => (
              <DropdownMenuItem
                key={option}
                disabled={option === status || pending}
                onClick={() => handleChange(option)}
                className="gap-2"
              >
                <span
                  className={cn("size-2 rounded-full", statusConfig[option].dot)}
                />
                {statusConfig[option].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
