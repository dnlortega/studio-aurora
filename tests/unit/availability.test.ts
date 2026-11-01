import { describe, expect, it } from "vitest";

import {
  computeDayAvailability,
  findNextAvailableDay,
  isRangeFree,
  rangesOverlap,
  suggestAlternativeSlots,
  type AvailabilityInput,
  type DayHours,
} from "@/lib/booking/availability";

const HOURS: DayHours = {
  isOpen: true,
  openMinute: 9 * 60,
  closeMinute: 19 * 60,
  breakStartMinute: 12 * 60,
  breakEndMinute: 13 * 60,
};

const RULES = {
  slotGranularityMin: 30,
  minLeadMinutes: 120,
  maxLeadDays: 60,
};

const NOW = { day: "2026-10-28", minute: 10 * 60 };

function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    day: "2026-10-29",
    durationMin: 60,
    hours: HOURS,
    blocks: [],
    busy: [],
    now: NOW,
    rules: RULES,
    ...overrides,
  };
}

describe("rangesOverlap / isRangeFree", () => {
  it("detecta sobreposição e permite intervalos encostados", () => {
    expect(rangesOverlap(540, 600, 599, 660)).toBe(true);
    expect(rangesOverlap(540, 600, 600, 660)).toBe(false);
    expect(rangesOverlap(600, 660, 540, 600)).toBe(false);
    expect(isRangeFree(540, 600, [{ startMinute: 600, endMinute: 660 }])).toBe(
      true,
    );
    expect(isRangeFree(540, 601, [{ startMinute: 600, endMinute: 660 }])).toBe(
      false,
    );
  });
});

describe("computeDayAvailability", () => {
  it("gera a grade respeitando abertura, fechamento e intervalo", () => {
    const result = computeDayAvailability(input());
    expect(result.reason).toBe("ok");
    expect(result.slots).toContain(9 * 60);
    expect(result.slots).toContain(11 * 60); // termina 12:00, encosta no intervalo
    expect(result.slots).not.toContain(11 * 60 + 30); // 11:30–12:30 cruza o intervalo
    expect(result.slots).toContain(13 * 60);
    expect(result.slots).toContain(18 * 60); // termina exatamente no fechamento
    expect(result.slots).not.toContain(18 * 60 + 30);
    expect(result.slots.every((minute) => minute % 30 === 0)).toBe(true);
  });

  it("respeita a antecedência mínima no mesmo dia", () => {
    const result = computeDayAvailability(
      input({ day: NOW.day, now: { day: NOW.day, minute: 10 * 60 } }),
    );
    // 10:00 + 120min = 12:00, que está no intervalo; o primeiro livre é 13:00.
    expect(result.slots[0]).toBe(13 * 60);
  });

  it("considera bloqueios e agendamentos existentes", () => {
    const result = computeDayAvailability(
      input({
        blocks: [{ startMinute: 9 * 60, endMinute: 9 * 60 + 30 }],
        busy: [{ startMinute: 10 * 60, endMinute: 11 * 60 }],
      }),
    );
    expect(result.slots).not.toContain(9 * 60);
    expect(result.slots).not.toContain(10 * 60);
    expect(result.slots).not.toContain(10 * 60 + 30);
    expect(result.slots).toContain(11 * 60);
  });

  it("permite encaixe imediatamente após um atendimento", () => {
    const result = computeDayAvailability(
      input({
        blocks: [],
        busy: [{ startMinute: 9 * 60, endMinute: 10 * 60 }],
      }),
    );
    expect(result.slots).toContain(10 * 60);
    expect(result.slots).not.toContain(9 * 60 + 30);
  });

  it("rejeita datas passadas e fora da janela", () => {
    expect(
      computeDayAvailability(input({ day: "2026-10-27" })).reason,
    ).toBe("past");
    expect(
      computeDayAvailability(input({ day: "2027-01-02" })).reason,
    ).toBe("beyond-window");
  });

  it("fecha o dia quando o salão não abre", () => {
    const result = computeDayAvailability(
      input({ hours: { ...HOURS, isOpen: false } }),
    );
    expect(result.reason).toBe("closed");
    expect(result.slots).toEqual([]);
  });

  it("marca como lotado quando não há espaço para a duração total", () => {
    const result = computeDayAvailability(
      input({
        durationMin: 10 * 60,
      }),
    );
    expect(result.reason).toBe("fully-booked");
    expect(result.slots).toEqual([]);
  });

  it("permite duração total que termina exatamente no fechamento", () => {
    const result = computeDayAvailability(
      input({
        durationMin: 10 * 60,
        hours: { ...HOURS, closeMinute: 19 * 60, breakStartMinute: null, breakEndMinute: null },
      }),
    );
    expect(result.slots).toEqual([9 * 60]);
  });

  it("respeita o passo mínimo de 5 minutos da grade", () => {
    const result = computeDayAvailability(
      input({
        durationMin: 30,
        hours: { ...HOURS, closeMinute: 11 * 60, breakStartMinute: null, breakEndMinute: null },
        rules: { ...RULES, slotGranularityMin: 1 },
      }),
    );
    expect(result.slots.slice(0, 4)).toEqual([
      9 * 60,
      9 * 60 + 5,
      9 * 60 + 10,
      9 * 60 + 15,
    ]);
    expect(result.slots.length).toBe(19);
    expect(
      result.slots.every((minute, index) => index === 0 || minute - result.slots[index - 1] === 5),
    ).toBe(true);
  });

  it("rejeita duração inválida", () => {
    expect(computeDayAvailability(input({ durationMin: 0 })).reason).toBe(
      "invalid-duration",
    );
    expect(computeDayAvailability(input({ durationMin: -30 })).reason).toBe(
      "invalid-duration",
    );
  });
});

describe("sugestões e varredura", () => {
  it("sugere os horários mais próximos do preferido", () => {
    const slots = suggestAlternativeSlots(input(), 13 * 60 + 10, 3);
    expect(slots).toEqual([13 * 60, 13 * 60 + 30, 14 * 60]);
  });

  it("encontra o próximo dia com disponibilidade", () => {
    const closed = input({ day: "2026-10-29", hours: null });
    const open = input({ day: "2026-10-30" });
    expect(findNextAvailableDay([closed, open])?.day).toBe("2026-10-30");
    expect(findNextAvailableDay([closed])).toBeNull();
  });
});
