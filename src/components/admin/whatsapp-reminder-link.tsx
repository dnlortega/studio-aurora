import { MessageCircle, PhoneOff } from "lucide-react";

import { IconLink } from "@/components/shared/icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { whatsappReminderUrl } from "@/lib/booking/reminder";
import type { AppointmentListItem } from "@/lib/booking/queries";

type Size = NonNullable<React.ComponentProps<typeof IconLink>["size"]>;
type Variant = NonNullable<React.ComponentProps<typeof IconLink>["variant"]>;

/**
 * Link de lembrete por WhatsApp para um agendamento.
 *
 * O botão abre o WhatsApp da cliente com a mensagem de lembrete já escrita
 * (data dd/mm/aaaa, hora marcada e serviços). Aparece só nos status em que
 * lembrar faz sentido (pendente e confirmado). Quando não há telefone
 * utilizável, `fallback` explica o motivo em vez de sumir sem avisar.
 */
export function WhatsAppReminderLink({
  appointment,
  salonName,
  address,
  size = "icon-xs",
  variant = "ghost",
  tooltipSide = "left",
  fallback = null,
}: {
  appointment: AppointmentListItem;
  salonName: string;
  address?: string | null;
  size?: Size;
  variant?: Variant;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  fallback?: React.ReactNode;
}) {
  if (appointment.status !== "pending" && appointment.status !== "confirmed") {
    return null;
  }

  const link = whatsappReminderUrl({
    salonName,
    address,
    clientName: appointment.clientName,
    clientPhone: appointment.clientPhone,
    day: appointment.startsOn,
    startMinute: appointment.startMinute,
    endMinute: appointment.endMinute,
    serviceNames: appointment.items.map((item) => item.serviceName),
    totalPriceCents: appointment.totalPriceCents,
  });

  if (!link) return <>{fallback}</>;

  const label = `Lembrar ${appointment.clientName} no WhatsApp`;

  return (
    <IconLink
      href={link.href}
      target="_blank"
      rel="noreferrer"
      label={label}
      variant={variant}
      size={size}
      tooltipSide={tooltipSide}
      className="self-start text-primary hover:bg-primary/10 sm:self-auto"
    >
      <MessageCircle
        className={size === "icon" || size === "icon-lg" ? "size-4" : "size-3.5"}
      />
    </IconLink>
  );
}

/** Aviso usado quando o botão não pode aparecer: falta o telefone. */
export function MissingPhoneHint({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex items-center text-muted-foreground" />
        }
      >
        <PhoneOff className="size-3.5" />
        <span className="sr-only">{name} sem telefone</span>
      </TooltipTrigger>
      <TooltipContent side="left">
        {name} não tem telefone utilizável — cadastre o WhatsApp dela para enviar
        o lembrete.
      </TooltipContent>
    </Tooltip>
  );
}
