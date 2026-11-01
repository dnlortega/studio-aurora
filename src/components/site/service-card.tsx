import { CalendarDays, Clock3 } from "lucide-react";

import { IconLink } from "@/components/shared/icon-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { renderServiceIcon } from "@/components/shared/service-icon";
import { formatCurrency, formatDuration } from "@/lib/dates";
import type { Service } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function ServiceCard({
  service,
  className,
}: {
  service: Service;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg",
        className,
      )}
    >
      {service.imageUrl ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={service.imageUrl}
            alt={service.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="relative flex h-20 items-end justify-between overflow-hidden bg-gradient-to-br from-secondary via-background to-accent/40 px-5">
          <div className="absolute -right-6 -top-8 size-24 rounded-full border border-primary/10" />
          <div className="absolute -right-1 -top-3 size-16 rounded-full border border-primary/10" />
          <span className="grid size-10 place-items-center rounded-full border border-primary/15 bg-card/80 text-primary shadow-sm">
            {renderServiceIcon(service.name, "size-4.5")}
          </span>
          <Badge variant="outline" className="mb-3 gap-1 bg-card/80 text-xs">
            <Clock3 className="size-3" />
            {formatDuration(service.durationMin)}
          </Badge>
        </div>
      )}

      <CardHeader className="gap-1.5 pb-2">
        <CardTitle className="text-lg font-medium">{service.name}</CardTitle>
        <CardDescription className="line-clamp-3 text-sm leading-relaxed">
          {service.description ??
            "Um cuidado pensado para realçar a sua beleza natural."}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto pb-0">
        <div className="flex items-end justify-between gap-3 border-t border-border/70 pt-4">
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              A partir de
            </p>
            <p className="font-heading text-xl font-medium">
              {formatCurrency(service.priceCents)}
            </p>
          </div>
          {service.imageUrl ? (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock3 className="size-3" />
              {formatDuration(service.durationMin)}
            </Badge>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="justify-end pb-4">
        <IconLink
          href={`/agendar?servico=${service.slug}`}
          label="Agendar"
          variant="ghost"
          size="icon-sm"
          className="text-primary hover:bg-transparent hover:text-primary/80"
          tooltipSide="left"
        >
          <CalendarDays className="size-3.5" />
        </IconLink>
      </CardFooter>
    </Card>
  );
}
