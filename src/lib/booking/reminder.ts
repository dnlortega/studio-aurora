import { formatCurrency, formatDayNumeric, minutesToTime } from "@/lib/dates";

/**
 * Lembrete de horário enviado pelo WhatsApp do próprio salão.
 *
 * Nada aqui envia mensagem: geramos o link `wa.me` com o texto pronto e o
 * navegador abre o WhatsApp (app ou Web) do lado do administrador. Por isso o
 * sistema nunca registra esse envio como notificação entregue — seria fingir
 * uma mensagem que saiu de outro lugar.
 */

export type ReminderInput = {
  salonName: string;
  address?: string | null;
  clientName: string;
  clientPhone: string | null;
  day: string;
  startMinute: number;
  endMinute: number;
  serviceNames: string[];
  totalPriceCents: number;
};

/**
 * Normaliza o telefone brasileiro para o formato aceito pelo `wa.me`
 * (somente dígitos, com DDI 55). Números fora do padrão devolvem `null` para
 * não abrir uma conversa errada.
 */
export function internationalPhone(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";

  // 10 dígitos = fixo/celular com DDD, 11 = celular com nono dígito.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Já salvo com DDI (o DDD 55 do Rio Grande do Sul confundiria um startWith).
  if (digits.length >= 12 && digits.length <= 15 && digits.startsWith("55")) {
    return digits;
  }
  return null;
}

/** Texto do lembrete, sem markdown: o WhatsApp mostra o que está aqui. */
export function reminderMessage(input: ReminderInput): string {
  const services =
    input.serviceNames.length > 0
      ? input.serviceNames.join(", ")
      : "a combinar no salão";

  const lines = [
    `Olá, ${input.clientName}! Aqui é do ${input.salonName}.`,
    "",
    "Passando para lembrar do seu horário agendado:",
    "",
    `Data: ${formatDayNumeric(input.day)}`,
    `Hora: ${minutesToTime(input.startMinute)} (término previsto para ${minutesToTime(
      input.endMinute,
    )})`,
    `Serviços: ${services}`,
    // O formato pt-BR usa espaço não divisível; trocamos por espaço comum para
    // que o texto continue legível onde o WhatsApp não preserva o caracter.
    `Valor: ${formatCurrency(input.totalPriceCents).replace(/\u00a0/g, " ")}`,
  ];

  if (input.address) {
    lines.push(`Endereço: ${input.address}`);
  }

  lines.push(
    "",
    "Se precisar remarcar ou cancelar, é só responder esta mensagem ou usar o painel do salão. Até lá!",
  );

  return lines.join("\n");
}

/**
 * Link pronto para o WhatsApp do cliente, ou `null` quando não há telefone
 * utilizável — a interface então explica por que o lembrete não aparece.
 */
export function whatsappReminderUrl(
  input: ReminderInput,
): { href: string; phone: string } | null {
  const phone = internationalPhone(input.clientPhone);
  if (!phone) return null;
  return {
    href: `https://wa.me/${phone}?text=${encodeURIComponent(reminderMessage(input))}`,
    phone,
  };
}
