"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { adminCancelAction } from "@/actions/admin";
import { IconButton } from "@/components/shared/icon-button";
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
import { Textarea } from "@/components/ui/textarea";

export function AdminCancelButton({
  appointmentId,
  clientName,
}: {
  appointmentId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const result = await adminCancelAction({
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

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="destructive"
            size="icon-sm"
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
          <AlertDialogTitle>
            Cancelar o agendamento de {clientName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            O horário será liberado na agenda. A cliente verá o status cancelado
            no painel e o histórico registra a ação com seu nome.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <label
            htmlFor="admin-cancel-reason"
            className="text-xs font-medium text-muted-foreground"
          >
            Motivo (opcional)
          </label>
          <Textarea
            id="admin-cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Ex.: cliente pediu por telefone."
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            size="icon-sm"
            aria-label="Voltar"
            title="Voltar"
            disabled={pending}
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <IconButton
            label="Confirmar cancelamento"
            variant="destructive"
            size="icon-sm"
            disabled={pending}
            onClick={handleCancel}
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
  );
}
