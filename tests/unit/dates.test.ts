import { describe, expect, it } from "vitest";

import {
  addDays,
  daysBetween,
  daysInMonth,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatMinuteRange,
  getSalonNow,
  isValidTimeZone,
  minutesToTime,
  monthKey,
  startOfWeek,
  timeToMinutes,
  weekdayOf,
} from "@/lib/dates";

describe("datas de agenda (YYYY-MM-DD)", () => {
  it("soma dias atravessando mês, ano e ano bissexto", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("calcula distância em dias de calendário", () => {
    expect(daysBetween("2026-10-28", "2026-10-28")).toBe(0);
    expect(daysBetween("2026-10-28", "2026-11-02")).toBe(5);
    expect(daysBetween("2026-11-02", "2026-10-28")).toBe(-5);
  });

  it("identifica o dia da semana sem depender do fuso do servidor", () => {
    expect(weekdayOf("2026-10-28")).toBe(3); // quarta-feira
    expect(weekdayOf("2026-10-25")).toBe(0); // domingo
  });

  it("gera todos os dias do mês", () => {
    expect(daysInMonth("2026-02")).toHaveLength(28);
    expect(daysInMonth("2028-02")).toHaveLength(29);
    expect(daysInMonth("2026-10")[0]).toBe("2026-10-01");
    expect(daysInMonth("2026-10").at(-1)).toBe("2026-10-31");
  });

  it("encontra o início da semana", () => {
    expect(startOfWeek("2026-10-28")).toBe("2026-10-25");
    expect(startOfWeek("2026-10-28", 1)).toBe("2026-10-26");
  });

  it("formata chave de mês", () => {
    expect(monthKey("2026-10-28")).toBe("2026-10");
  });
});

describe("getSalonNow", () => {
  it("converte um instante para o dia e minuto locais do salão", () => {
    // 02:00 UTC = 23:00 do dia anterior em São Paulo (UTC-3).
    expect(
      getSalonNow("America/Sao_Paulo", new Date("2026-10-28T02:00:00.000Z")),
    ).toEqual({ day: "2026-10-27", minute: 23 * 60 });

    // 12:00 UTC = 09:00 em São Paulo.
    expect(
      getSalonNow("America/Sao_Paulo", new Date("2026-10-28T12:00:00.000Z")),
    ).toEqual({ day: "2026-10-28", minute: 9 * 60 });

    // 00:30 UTC = 21:30 do dia anterior em São Paulo.
    expect(
      getSalonNow("America/Sao_Paulo", new Date("2026-10-29T00:30:00.000Z")),
    ).toEqual({ day: "2026-10-28", minute: 21 * 60 + 30 });
  });

  it("respeita fusos com deslocamento positivo", () => {
    // 23:00 UTC = 08:00 do dia seguinte em Tóquio (UTC+9).
    expect(
      getSalonNow("Asia/Tokyo", new Date("2026-10-28T23:00:00.000Z")),
    ).toEqual({ day: "2026-10-29", minute: 8 * 60 });
  });
});

describe("horários e formatação", () => {
  it("converte minutos em HH:MM e vice-versa", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(9 * 60 + 5)).toBe("09:05");
    expect(minutesToTime(23 * 60 + 59)).toBe("23:59");
    expect(timeToMinutes("09:05")).toBe(545);
    expect(timeToMinutes("24:00")).toBeNull();
    expect(timeToMinutes("9:00")).toBeNull();
    expect(timeToMinutes("abc")).toBeNull();
  });

  it("formata intervalos e durações", () => {
    expect(formatMinuteRange(540, 660)).toBe("09:00 – 11:00");
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(100)).toBe("1h40");
    expect(formatDuration(150)).toBe("2h30");
  });

  it("formata dinheiro em reais", () => {
    expect(formatCurrency(14000)).toMatch(/140,00/);
    expect(formatCurrency(0)).toMatch(/0,00/);
  });

  it("formata data e hora no fuso do salão", () => {
    const formatted = formatDateTime(
      new Date("2026-10-28T15:30:00.000Z"),
      "America/Sao_Paulo",
    );
    expect(formatted).toContain("28/10/2026");
    expect(formatted).toContain("12:30");
  });

  it("valida identificadores IANA", () => {
    expect(isValidTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimeZone("Europe/Lisbon")).toBe(true);
    expect(isValidTimeZone("Marte/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
