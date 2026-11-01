"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Save } from "lucide-react";
import { toast } from "sonner";

import { updateBusinessHoursAction } from "@/actions/admin";
import { IconSubmitButton } from "@/components/shared/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { weekdayName } from "@/lib/dates";

export type EditableHour = {
  weekday: number;
  isOpen: boolean;
  open: string;
  close: string;
  breakStart: string;
  breakEnd: string;
};

export function BusinessHoursForm({
  initial,
  timezone,
}: {
  initial: EditableHour[];
  timezone: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableHour[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(weekday: number, patch: Partial<EditableHour>) {
    setRows((current) =>
      current.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateBusinessHoursAction(
        rows.map((row) => ({
          weekday: row.weekday,
          isOpen: row.isOpen,
          open: row.open,
          close: row.close,
          breakStart: row.isOpen && row.breakStart ? row.breakStart : undefined,
          breakEnd: row.isOpen && row.breakEnd ? row.breakEnd : undefined,
        })),
      );

      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.weekday}
            className="rounded-xl border border-border/70 bg-card p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Switch
                  id={`open-${row.weekday}`}
                  checked={row.isOpen}
                  onCheckedChange={(checked) =>
                    update(row.weekday, { isOpen: checked })
                  }
                  aria-label={`Abrir ${weekdayName(row.weekday)}`}
                />
                <Label
                  htmlFor={`open-${row.weekday}`}
                  className="text-sm font-medium"
                >
                  {weekdayName(row.weekday)}
                </Label>
                {!row.isOpen ? (
                  <span className="text-xs text-muted-foreground">Fechado</span>
                ) : null}
              </div>

              {row.isOpen ? (
                <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-[7.5rem_7.5rem_7.5rem_7.5rem]">
                  <div className="space-y-1">
                    <Label
                      htmlFor={`open-time-${row.weekday}`}
                      className="text-[0.65rem] text-muted-foreground"
                    >
                      Abertura
                    </Label>
                    <Input
                      id={`open-time-${row.weekday}`}
                      type="time"
                      value={row.open}
                      onChange={(event) =>
                        update(row.weekday, { open: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`close-time-${row.weekday}`}
                      className="text-[0.65rem] text-muted-foreground"
                    >
                      Fechamento
                    </Label>
                    <Input
                      id={`close-time-${row.weekday}`}
                      type="time"
                      value={row.close}
                      onChange={(event) =>
                        update(row.weekday, { close: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`break-start-${row.weekday}`}
                      className="flex items-center gap-1 text-[0.65rem] text-muted-foreground"
                    >
                      <Coffee className="size-3" />
                      Intervalo
                    </Label>
                    <Input
                      id={`break-start-${row.weekday}`}
                      type="time"
                      value={row.breakStart}
                      onChange={(event) =>
                        update(row.weekday, { breakStart: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor={`break-end-${row.weekday}`}
                      className="text-[0.65rem] text-muted-foreground"
                    >
                      Fim do intervalo
                    </Label>
                    <Input
                      id={`break-end-${row.weekday}`}
                      type="time"
                      value={row.breakEnd}
                      onChange={(event) =>
                        update(row.weekday, { breakEnd: event.target.value })
                      }
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sem atendimento neste dia.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
        <p className="text-xs text-muted-foreground">
          Os horários são interpretados no fuso {timezone.replaceAll("_", " ")}.
        </p>
        <IconSubmitButton
          label="Salvar horários"
          pending={pending}
          icon={<Save className="size-4" />}
        />
      </div>
    </form>
  );
}
