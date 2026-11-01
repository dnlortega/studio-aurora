import { CalendarOff, Clock3 } from "lucide-react";

import { BlockForm, DeleteBlockButton } from "@/components/admin/block-forms";
import { EmptyState } from "@/components/shared/empty-state";
import { IconLink } from "@/components/shared/icon-button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getScheduleBlocks } from "@/lib/booking/queries";
import {
  formatDayLong,
  formatMinuteRange,
  getSalonNow,
} from "@/lib/dates";
import { requireAdmin } from "@/lib/auth/guards";
import { getSettings } from "@/lib/settings";

export default async function AdminBlocksPage() {
  await requireAdmin("/admin/bloqueios");
  const settings = await getSettings();
  const now = getSalonNow(settings.timezone);
  const blocks = await getScheduleBlocks(now.day);

  const grouped = new Map<string, typeof blocks>();
  for (const block of blocks) {
    const list = grouped.get(block.day) ?? [];
    list.push(block);
    grouped.set(block.day, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Disponibilidade"
        title="Bloqueios e folgas"
        description="Reserve períodos sem atendimento — folgas, feriados, compromissos ou manutenção. Bloqueios valem para novos agendamentos; atendimentos ativos no período impedem o bloqueio."
        actions={
          <IconLink href="/admin/agenda" label="Ver agenda" variant="outline">
            <Clock3 className="size-4" />
          </IconLink>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[23rem_minmax(0,1fr)] xl:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarOff className="size-4 text-muted-foreground" />
              Novo bloqueio
            </CardTitle>
            <CardDescription>
              O intervalo fica indisponível para reservas online e manuais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlockForm today={now.day} defaultDay={now.day} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos bloqueios</CardTitle>
            <CardDescription>
              {blocks.length} período{blocks.length === 1 ? "" : "s"} a partir de
              hoje.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blocks.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="Nenhum bloqueio futuro"
                description="A agenda está seguindo apenas os horários de funcionamento e os atendimentos já marcados."
              />
            ) : (
              <div className="space-y-4">
                {[...grouped.entries()].map(([day, dayBlocks]) => (
                  <div key={day} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium first-letter:uppercase">
                        {formatDayLong(day)}
                      </p>
                      <Badge variant="outline" className="text-[0.62rem] text-muted-foreground">
                        {dayBlocks.length} bloqueio{dayBlocks.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {dayBlocks.map((block) => {
                        const label = `${formatDayLong(day)}, ${formatMinuteRange(
                          block.startMinute,
                          block.endMinute,
                        )}`;
                        return (
                          <div
                            key={block.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium tabular-nums">
                                {formatMinuteRange(
                                  block.startMinute,
                                  block.endMinute,
                                )}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {block.reason}
                              </p>
                            </div>
                            <DeleteBlockButton blockId={block.id} label={label} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
        Organização sugerida: use horários de funcionamento para a rotina semanal e
        bloqueios apenas para exceções pontuais. Bloqueios já passados deixam de
        aparecer nesta lista, mas permanecem no banco e no registro de auditoria.
      </p>
    </div>
  );
}
