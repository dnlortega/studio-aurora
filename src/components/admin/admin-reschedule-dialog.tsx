"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Info, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { adminRescheduleAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDuration, minutesToTime } from "@/lib/dates";

export function AdminRescheduleDialog({
  appointmentId,
  day,
  startMinute,
  durationMin,
  serviceIds,
  today,
  disabled,
}: {
  appointmentId: string;
  day: string;
  startMinute: number;
  durationMin: number;
  serviceIds: string[];
  today: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetDay, setTargetDay] = useState(day);
  const [slots, setSlots] = useState<number[]>([]);
  const [minute, setMinute] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const serviceKey = serviceIds.join(",");

  useEffect(() => {
    if (!open) return;
    setMinute(null);
    if (!targetDay || serviceIds.length === 0) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(
      `/api/disponibilidade?data=${targetDay}&servicos=${serviceKey}&ignorar=${appointmentId}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Erro ao consultar.");
        setSlots(data.slots ?? []);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, targetDay, serviceKey, appointmentId, serviceIds.length]);

  function handleSubmit() {
    if (!minute) {
      toast.error("Escolha um novo horário.");
      return;
    }
    startTransition(async () => {
      const result = await adminRescheduleAction({
        appointmentId,
        day: targetDay,
        startMinute: minute,
        serviceIds,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Agendamento reagendado.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Reagendar"
            title="Reagendar"
            disabled={disabled || serviceIds.length === 0}
          >
            <CalendarClock className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reagendar atendimento</DialogTitle>
          <DialogDescription>
            O horário atual é {minutesToTime(startMinute)} (
            {formatDuration(durationMin)}). Escolha uma nova data e um horário
            realmente livre para os mesmos serviços.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-reschedule-day"
              className="text-xs font-medium text-muted-foreground"
            >
              Nova data
            </label>
            <Input
              id="admin-reschedule-day"
              type="date"
              min={today}
              value={targetDay}
              onChange={(event) => setTargetDay(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Horários disponíveis
            </p>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Consultando agenda…
              </div>
            ) : error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </p>
            ) : slots.length === 0 ? (
              <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Nenhum horário livre nesta data para os serviços do agendamento.
              </div>
            ) : (
              <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto pr-1">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setMinute(slot)}
                    aria-pressed={minute === slot}
                    className={`h-9 rounded-lg border text-sm tabular-nums transition-colors ${
                      minute === slot
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {minutesToTime(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button
                variant="outline"
                size="icon"
                aria-label="Cancelar"
                title="Cancelar"
                disabled={pending}
              >
                <X className="size-4" />
              </Button>
            }
          />
          <IconButton
            label="Confirmar novo horário"
            disabled={pending || loading || minute === null}
            onClick={handleSubmit}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarClock className="size-4" />
            )}
          </IconButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
