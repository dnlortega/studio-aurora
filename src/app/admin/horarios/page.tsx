import Link from "next/link";
import { CalendarOff, Clock3, Info } from "lucide-react";

import {
  BusinessHoursForm,
  type EditableHour,
} from "@/components/admin/business-hours-form";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBusinessHours } from "@/lib/booking/queries";
import { minutesToTime } from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export default async function AdminHoursPage() {
  await requireAdmin("/admin/horarios");
  const [rows, settings] = await Promise.all([getBusinessHours(), getSettings()]);

  const initial: EditableHour[] = Array.from({ length: 7 }, (_, weekday) => {
    const row = rows.find((item) => item.weekday === weekday);
    return {
      weekday,
      isOpen: row?.isOpen ?? false,
      open: row ? minutesToTime(row.openMinute) : "09:00",
      close: row ? minutesToTime(row.closeMinute) : "18:00",
      breakStart:
        row?.breakStartMinute !== null && row?.breakStartMinute !== undefined
          ? minutesToTime(row.breakStartMinute)
          : "",
      breakEnd:
        row?.breakEndMinute !== null && row?.breakEndMinute !== undefined
          ? minutesToTime(row.breakEndMinute)
          : "",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disponibilidade"
        title="Horários de funcionamento"
        description="Defina os dias e horários de atendimento. A agenda pública só oferece horários dentro do expediente, descontando o intervalo."
        actions={
          <IconLink href="/admin/bloqueios" label="Bloqueios e folgas" variant="outline">
            <CalendarOff className="size-4" />
          </IconLink>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <BusinessHoursForm initial={initial} timezone={settings.timezone} />

        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="size-4 text-muted-foreground" />
                Como a agenda é calculada
              </CardTitle>
              <CardDescription>
                A mesma regra vale para o site, para o admin e para a API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                O horário de início é gerado em passos de{" "}
                <span className="text-foreground">
                  {settings.slotGranularityMin} minutos
                </span>{" "}
                a partir da abertura.
              </p>
              <p>
                O sistema exige antecedência mínima de{" "}
                <span className="text-foreground">
                  {settings.minLeadMinutes} minutos
                </span>{" "}
                e abre agenda para até{" "}
                <span className="text-foreground">{settings.maxLeadDays} dias</span>.
              </p>
              <p>
                A duração total dos serviços selecionados precisa caber até o
                fechamento, sem sobrepor o intervalo, bloqueios ou outros
                atendimentos ativos.
              </p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="size-4 text-muted-foreground" />
                Alterações seguras
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p>
                Reduzir o expediente não cancela agendamentos existentes. Se
                houver conflito, o sistema continua mostrando os atendimentos já
                marcados — revise a agenda antes de fechar um dia inteiro.
              </p>
              <p>
                Para folgas pontuais ou feriados, use{" "}
                <Link href="/admin/bloqueios" className="text-primary hover:underline">
                  Bloqueios e folgas
                </Link>
                . O bloqueio impede novas reservas no período.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
