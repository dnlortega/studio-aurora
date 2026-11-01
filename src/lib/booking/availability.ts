import { daysBetween, type SalonNow } from "@/lib/dates";

export type MinuteRange = { startMinute: number; endMinute: number };

export type DayHours = {
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
  breakStartMinute: number | null;
  breakEndMinute: number | null;
};

export type AvailabilityRules = {
  slotGranularityMin: number;
  minLeadMinutes: number;
  maxLeadDays: number;
};

export type AvailabilityInput = {
  day: string;
  durationMin: number;
  hours: DayHours | null;
  blocks: MinuteRange[];
  busy: MinuteRange[];
  now: SalonNow;
  rules: AvailabilityRules;
};

export type DayAvailability = {
  day: string;
  isBookable: boolean;
  reason:
    | "ok"
    | "past"
    | "beyond-window"
    | "closed"
    | "fully-booked"
    | "invalid-duration";
  slots: number[];
};

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isRangeFree(
  startMinute: number,
  endMinute: number,
  ranges: MinuteRange[],
): boolean {
  return !ranges.some((range) =>
    rangesOverlap(startMinute, endMinute, range.startMinute, range.endMinute),
  );
}

/**
 * Calcula os horários de início possíveis para um dia, considerando:
 * expediente, intervalo, bloqueios, agendamentos existentes, duração total,
 * antecedência mínima e janela máxima de agendamento.
 *
 * Função pura — é a mesma usada na interface, na API e na transação de reserva.
 */
export function computeDayAvailability(
  input: AvailabilityInput,
): DayAvailability {
  const { day, durationMin, hours, blocks, busy, now, rules } = input;

  const base = { day, slots: [] as number[] };

  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return { ...base, isBookable: false, reason: "invalid-duration" };
  }

  const distance = daysBetween(now.day, day);
  if (distance < 0) {
    return { ...base, isBookable: false, reason: "past" };
  }
  if (distance > rules.maxLeadDays) {
    return { ...base, isBookable: false, reason: "beyond-window" };
  }
  if (!hours || !hours.isOpen) {
    return { ...base, isBookable: false, reason: "closed" };
  }

  const granularity = Math.max(5, rules.slotGranularityMin);
  const earliestMinute =
    distance === 0 ? now.minute + Math.max(0, rules.minLeadMinutes) : 0;

  const blocked: MinuteRange[] = [...blocks, ...busy];
  if (
    hours.breakStartMinute !== null &&
    hours.breakEndMinute !== null &&
    hours.breakEndMinute > hours.breakStartMinute
  ) {
    blocked.push({
      startMinute: hours.breakStartMinute,
      endMinute: hours.breakEndMinute,
    });
  }

  const slots: number[] = [];
  for (
    let start = hours.openMinute;
    start + durationMin <= hours.closeMinute;
    start += granularity
  ) {
    if (start < earliestMinute) continue;
    if (!isRangeFree(start, start + durationMin, blocked)) continue;
    slots.push(start);
  }

  return {
    day,
    slots,
    isBookable: slots.length > 0,
    reason: slots.length > 0 ? "ok" : "fully-booked",
  };
}

export function isSlotAvailable(input: AvailabilityInput, startMinute: number) {
  return computeDayAvailability(input).slots.includes(startMinute);
}

export function hasAnyAvailability(input: AvailabilityInput): boolean {
  return computeDayAvailability(input).slots.length > 0;
}

export function findNextAvailableDay(
  inputs: AvailabilityInput[],
): { day: string; slots: number[] } | null {
  for (const input of inputs) {
    const availability = computeDayAvailability(input);
    if (availability.slots.length > 0) {
      return { day: availability.day, slots: availability.slots };
    }
  }
  return null;
}

export function suggestAlternativeSlots(
  input: AvailabilityInput,
  preferredMinute: number,
  limit = 3,
): number[] {
  const { slots } = computeDayAvailability(input);
  return [...slots]
    .sort(
      (a, b) => Math.abs(a - preferredMinute) - Math.abs(b - preferredMinute),
    )
    .slice(0, limit)
    .sort((a, b) => a - b);
}

export const availabilityReasonLabel: Record<DayAvailability["reason"], string> = {
  ok: "Disponível",
  past: "Data passada",
  "beyond-window": "Fora da janela de agendamento",
  closed: "Salão fechado",
  "fully-booked": "Sem horários disponíveis",
  "invalid-duration": "Duração inválida",
};
