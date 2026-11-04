import { describe, expect, it } from "vitest";

import {
  internationalPhone,
  reminderMessage,
  whatsappReminderUrl,
} from "@/lib/booking/reminder";

const base = {
  salonName: "Studio Aurora",
  address: "Rua Harmonia, 402 — São Paulo/SP",
  clientName: "Ana Beatriz",
  clientPhone: "(11) 98888-7777",
  day: "2026-11-04",
  startMinute: 15 * 60,
  endMinute: 15 * 60 + 40,
  serviceNames: ["Manicure & esmaltação"],
  totalPriceCents: 5500,
};

describe("internationalPhone", () => {
  it("adiciona o DDI brasileiro ao número com DDD", () => {
    expect(internationalPhone("(11) 98888-7777")).toBe("5511988887777");
    expect(internationalPhone("11 3030-1414")).toBe("551130301414");
  });

  it("mantém um número que já veio com DDI", () => {
    expect(internationalPhone("+55 11 98888-7777")).toBe("5511988887777");
  });

  it("não inventa número incompleto", () => {
    expect(internationalPhone("98888-7777")).toBeNull();
    expect(internationalPhone("")).toBeNull();
    expect(internationalPhone(null)).toBeNull();
    expect(internationalPhone(undefined)).toBeNull();
  });
});

describe("reminderMessage", () => {
  it("lembra o cliente pelo nome, com data dd/mm/aaaa e hora marcada", () => {
    const message = reminderMessage(base);

    expect(message).toContain("Olá, Ana Beatriz!");
    expect(message).toContain("Studio Aurora");
    expect(message).toContain("04/11/2026");
    expect(message).toContain("15:00");
    expect(message).toContain("15:40");
    expect(message).toContain("Manicure & esmaltação");
    expect(message).toContain("Data: 04/11/2026");
    expect(message).toContain("R$ 55,00");
    expect(message).toContain("Rua Harmonia, 402");
    // dd/mm/aaaa puro: nem dia da semana, nem mês por extenso.
    expect(message).not.toMatch(/quarta|novembro/i);
  });

  it("lista os serviços combinados e omite o endereço quando não há", () => {
    const message = reminderMessage({
      ...base,
      address: null,
      serviceNames: ["Manicure & esmaltação", "Unhas em gel"],
    });

    expect(message).toContain("Manicure & esmaltação, Unhas em gel");
    expect(message).not.toContain("Endereço:");
  });
});

describe("whatsappReminderUrl", () => {
  it("monta o link wa.me com a mensagem codificada no parâmetro text", () => {
    const link = whatsappReminderUrl(base);
    expect(link?.phone).toBe("5511988887777");
    expect(link?.href.startsWith("https://wa.me/5511988887777?text=")).toBe(true);

    const decoded = decodeURIComponent(link!.href.split("?text=")[1]);
    expect(decoded).toContain("04/11/2026");
  });

  it("devolve nulo sem telefone — a tela precisa dizer por que não há botão", () => {
    expect(whatsappReminderUrl({ ...base, clientPhone: null })).toBeNull();
    expect(whatsappReminderUrl({ ...base, clientPhone: "sem numero" })).toBeNull();
  });
});
