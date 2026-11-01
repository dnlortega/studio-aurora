"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { createBlockAction, deleteBlockAction } from "@/actions/admin";
import { IconButton, IconSubmitButton } from "@/components/shared/icon-button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BlockForm({
  today,
  defaultDay,
}: {
  today: string;
  defaultDay: string;
}) {
  const router = useRouter();
  const [day, setDay] = useState(
    defaultDay >= today ? defaultDay : today,
  );
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    startTransition(async () => {
      const result = await createBlockAction({ day, start, end, reason });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setReason("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="block-day">Data</Label>
          <Input
            id="block-day"
            type="date"
            min={today}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-invalid={Boolean(errors.day)}
          />
          {errors.day ? (
            <p className="text-xs text-destructive">{errors.day}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-start">Início</Label>
          <Input
            id="block-start"
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            aria-invalid={Boolean(errors.start)}
          />
          {errors.start ? (
            <p className="text-xs text-destructive">{errors.start}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="block-end">Fim</Label>
          <Input
            id="block-end"
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            aria-invalid={Boolean(errors.end)}
          />
          {errors.end ? (
            <p className="text-xs text-destructive">{errors.end}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="block-reason">Motivo</Label>
        <Textarea
          id="block-reason"
          rows={2}
          maxLength={200}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ex.: folga, feriado, compromisso pessoal, manutenção…"
          aria-invalid={Boolean(errors.reason)}
        />
        {errors.reason ? (
          <p className="text-xs text-destructive">{errors.reason}</p>
        ) : null}
      </div>

      <IconSubmitButton
        label="Criar bloqueio"
        pending={pending}
        icon={<Plus className="size-4" />}
      />
      <p className="text-xs text-muted-foreground">
        O bloqueio impede novos agendamentos no período. Se houver atendimentos
        ativos nesse intervalo, a criação será recusada para você decidir antes.
      </p>
    </form>
  );
}

export function DeleteBlockButton({
  blockId,
  label,
}: {
  blockId: string;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBlockAction(blockId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remover bloqueio ${label}`}
            title={`Remover bloqueio ${label}`}
            className="text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <CalendarOff />
          </AlertDialogMedia>
          <AlertDialogTitle>Remover este bloqueio?</AlertDialogTitle>
          <AlertDialogDescription>
            {label}. O período volta a aceitar agendamentos pelo site.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            size="icon"
            aria-label="Manter"
            title="Manter"
            disabled={pending}
          >
            <X className="size-4" />
          </AlertDialogCancel>
          <IconButton
            label="Remover"
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </IconButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
