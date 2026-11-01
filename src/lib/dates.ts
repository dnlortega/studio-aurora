/**
 * Utilitários de data/hora do salão.
 *
 * Todas as datas de agenda são "dias locais do salão" representadas como
 * YYYY-MM-DD, e horários são minutos desde a meia-noite. Para fazer contas de
 * calendário sem depender do fuso do servidor, ancoramos as datas ao meio-dia
 * UTC (nunca há mudança de dia) e formatamos em UTC.
 */

export const MINUTES_IN_DAY = 24 * 60;

export type SalonNow = {
  /** YYYY-MM-DD no fuso do salão. */
  day: string;
  /** Minutos desde a meia-noite no fuso do salão. */
  minute: number;
};

export function parseDay(day: string): Date {
  return new Date(`${day}T12:00:00.000Z`);
}

export function toDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  const date = parseDay(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDay(date);
}

export function weekdayOf(day: string): number {
  return parseDay(day).getUTCDay();
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000,
  );
}

export function monthKey(day: string): string {
  return day.slice(0, 7);
}

export function daysInMonth(month: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from(
    { length: total },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`,
  );
}

export function getSalonNow(timeZone: string, reference = new Date()): SalonNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(reference);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const hour = get("hour") % 24;
  return {
    day: `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(
      get("day"),
    ).padStart(2, "0")}`,
    minute: hour * 60 + get("minute"),
  };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function minutesToTime(minute: number): string {
  const normalized = ((minute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinuteRange(start: number, end: number): string {
  return `${minutesToTime(start)} – ${minutesToTime(end)}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, "0")}`;
}

const dayLongFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "UTC",
});

const dayShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const fullFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDayLong(day: string): string {
  return dayLongFormatter.format(parseDay(day));
}

export function formatDayShort(day: string): string {
  return dayShortFormatter.format(parseDay(day)).replace(".", "");
}

export function formatMonth(month: string): string {
  return monthFormatter.format(parseDay(`${month}-01`));
}

export function formatFullDate(day: string): string {
  return fullFormatter.format(parseDay(day));
}

export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDayLong(start);
  return `${formatDayShort(start)} a ${formatDayShort(end)}`;
}

export function weekdayName(weekday: number): string {
  return ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][
    weekday
  ] ?? "";
}

export function weekdayShort(weekday: number): string {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][weekday] ?? "";
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Timestamp (instante) formatado no fuso do salão. */
export function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function startOfWeek(day: string, weekStartsOn = 0): string {
  const weekday = weekdayOf(day);
  const diff = (weekday - weekStartsOn + 7) % 7;
  return addDays(day, -diff);
}

export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const start = startOfWeek(first, 0);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
