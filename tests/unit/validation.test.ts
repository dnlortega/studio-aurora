import { describe, expect, it } from "vitest";

import {
  adminClientSchema,
  adminBookingSchema,
  blockSchema,
  bookingSchema,
  businessHoursSchema,
  loginSchema,
  serviceSchema,
  settingsSchema,
  signupSchema,
} from "@/lib/validation/schemas";

describe("signupSchema", () => {
  const base = {
    name: "Mariana Costa",
    email: "  MARIANA@EXEMPLO.COM ",
    phone: "(11) 98888-7777",
    password: "Aurora123",
    confirmPassword: "Aurora123",
  };

  it("normaliza e-mail e telefone", () => {
    const parsed = signupSchema.parse(base);
    expect(parsed.email).toBe("mariana@exemplo.com");
    expect(parsed.phone).toBe("11988887777");
  });

  it("recusa senhas divergentes e fracas", () => {
    expect(
      signupSchema.safeParse({ ...base, confirmPassword: "Outra123" }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({ ...base, password: "12345678" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normaliza o e-mail e exige senha", () => {
    expect(loginSchema.parse({ email: " A@B.COM ", password: "x" }).email).toBe(
      "a@b.com",
    );
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(
      false,
    );
  });
});

describe("bookingSchema / adminBookingSchema", () => {
  const base = {
    day: "2026-11-10",
    startMinute: "540",
    serviceIds: ["3f7a8d2e-9b1c-4a5d-8e6f-0a1b2c3d4e5f"],
    notes: "  observação  ",
  };

  it("converte minutos e aceita dados válidos", () => {
    const parsed = bookingSchema.parse(base);
    expect(parsed.startMinute).toBe(540);
  });

  it("exige data, serviço e horário dentro do dia", () => {
    expect(bookingSchema.safeParse({ ...base, day: "10/11/2026" }).success).toBe(
      false,
    );
    expect(bookingSchema.safeParse({ ...base, serviceIds: [] }).success).toBe(
      false,
    );
    expect(
      bookingSchema.safeParse({ ...base, startMinute: 1440 }).success,
    ).toBe(false);
  });

  it("exige cliente no agendamento manual", () => {
    expect(adminBookingSchema.safeParse(base).success).toBe(false);
    expect(
      adminBookingSchema.safeParse({
        ...base,
        clientId: "3f7a8d2e-9b1c-4a5d-8e6f-0a1b2c3d4e5f",
      }).success,
    ).toBe(true);
  });
});

describe("serviceSchema", () => {
  it("converte preço e duração e recusa valores fora do limite", () => {
    const parsed = serviceSchema.parse({
      name: "Manicure teste",
      price: "150.50",
      durationMin: "45",
    });
    expect(parsed.price).toBe(150.5);
    expect(parsed.durationMin).toBe(45);
    expect(parsed.isActive).toBe(true);

    expect(
      serviceSchema.safeParse({
        name: "Manicure",
        price: 10,
        durationMin: 4,
      }).success,
    ).toBe(false);
    expect(
      serviceSchema.safeParse({
        name: "Manicure",
        price: -1,
        durationMin: 30,
      }).success,
    ).toBe(false);
  });
});

describe("businessHoursSchema", () => {
  const day = {
    weekday: 2,
    isOpen: true,
    open: "09:00",
    close: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  };

  it("exige os sete dias da semana", () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      ...day,
      weekday: index,
    }));
    expect(businessHoursSchema.safeParse(rows).success).toBe(true);
    expect(businessHoursSchema.safeParse(rows.slice(0, 6)).success).toBe(false);
  });

  it("recusa fechamento antes da abertura e intervalo invertido", () => {
    expect(
      businessHoursSchema.safeParse([
        ...Array.from({ length: 6 }, (_, index) => ({
          ...day,
          weekday: index,
        })),
        { ...day, weekday: 6, open: "18:00", close: "09:00" },
      ]).success,
    ).toBe(false);

    expect(
      businessHoursSchema.safeParse([
        ...Array.from({ length: 6 }, (_, index) => ({
          ...day,
          weekday: index,
        })),
        { ...day, weekday: 6, breakStart: "15:00", breakEnd: "13:00" },
      ]).success,
    ).toBe(false);
  });
});

describe("blockSchema", () => {
  it("garante fim depois do início", () => {
    expect(
      blockSchema.safeParse({
        day: "2026-11-10",
        start: "12:00",
        end: "13:00",
        reason: "Almoço",
      }).success,
    ).toBe(true);
    expect(
      blockSchema.safeParse({
        day: "2026-11-10",
        start: "13:00",
        end: "12:00",
        reason: "Almoço",
      }).success,
    ).toBe(false);
  });
});

describe("settingsSchema", () => {
  it("converte números e aplica limites", () => {
    const parsed = settingsSchema.parse({
      salonName: "Studio Aurora",
      tagline: "Beleza",
      timezone: "America/Sao_Paulo",
      slotGranularityMin: "30",
      minLeadMinutes: "120",
      maxLeadDays: "60",
      cancelMinHours: "24",
      rescheduleMinHours: "24",
      maxServicesPerBooking: "3",
      autoConfirm: true,
    });
    expect(parsed.slotGranularityMin).toBe(30);
    expect(parsed.autoConfirm).toBe(true);
  });

  it("recusa granularidade fora da faixa", () => {
    expect(
      settingsSchema.safeParse({
        salonName: "Studio Aurora",
        tagline: "Beleza",
        timezone: "America/Sao_Paulo",
        slotGranularityMin: 1,
        minLeadMinutes: 0,
        maxLeadDays: 60,
        cancelMinHours: 24,
        rescheduleMinHours: 24,
        maxServicesPerBooking: 3,
      }).success,
    ).toBe(false);
  });
});

describe("adminClientSchema", () => {
  it("permite senha vazia ao editar e normaliza o telefone", () => {
    const parsed = adminClientSchema.parse({
      name: "Cliente Teste",
      email: "CLIENTE@TESTE.COM",
      phone: "(11) 90000-0000",
      password: "",
      isActive: true,
    });
    expect(parsed.email).toBe("cliente@teste.com");
    expect(parsed.phone).toBe("11900000000");
  });
});
