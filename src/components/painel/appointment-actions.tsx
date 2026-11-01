"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { cancelMyAppointmentAction } from "@/actions/booking";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { IconButton, IconLink } from "@/components/shared/icon-button";
import { Textarea } from "@/components/ui/textarea";

export function AppointmentActions({
  appointmentId,
  canCancel,
  canReschedule,
  cancelMinHours,
}: {
  appointmentId: string;
  canCancel: boolean;
  canReschedule: boolean;
  cancelMinHours: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelMyAppointmentAction({
        appointmentId,
        reason: reason.trim() || undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  if (!canCancel && !canReschedule) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {canReschedule ? (
        <IconLink
          href={`/agendar?reagendar=${appointmentId}`}
          label="Reagendar"
          variant="outline"
        >
          <CalendarClock className="size-4" />
        </IconLink>
      ) : null}

      {canCancel ? (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                size="icon"
                aria-label="Cancelar agendamento"
                title="Cancelar agendamento"
              >
                <XCircle className="size-4" />
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive">
                <XCircle />
              </AlertDialogMedia>
              <AlertDialogTitle>Cancelar este agendamento?</AlertDialogTitle>
              <AlertDialogDescription>
                O horário será liberado para outras pessoas. Cancelamentos pelo
                site são aceitos até {cancelMinHours}h antes do atendimento.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-1.5">
              <label
                htmlFor="cancel-reason"
                className="text-xs font-medium text-muted-foreground"
              >
                Motivo (opcional)
              </label>
              <Textarea
                id="cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Conte para o salão, se quiser."
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={pending}
                size="icon"
                aria-label="Manter horário"
                title="Manter horário"
              >
                <X className="size-4" />
              </AlertDialogCancel>
              <IconButton
                label="Sim, cancelar"
                variant="destructive"
                onClick={handleCancel}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
              </IconButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
