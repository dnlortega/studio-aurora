import { NextResponse } from "next/server";

import { getReport } from "@/lib/booking/queries";
import { STATUS_LABELS } from "@/lib/booking/service";
import { getCurrentUser } from "@/lib/auth/session";
import { minutesToTime } from "@/lib/dates";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * CSV por período, sempre lido do Neon no instante da requisição: nada de
 * resposta em cache e nada de buffer pré-renderizado no build.
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const runtime = "nodejs";

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[";\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function csvMoney(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Exporta os agendamentos do período em CSV compatível com Excel pt-BR
 * (separador ";" e BOM UTF-8). A rota valida o perfil no servidor — o link
 * público nunca é suficiente para acessar os dados.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sessão expirada. Entre novamente." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Acesso restrito ao administrador." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawFrom = searchParams.get("de");
  const rawTo = searchParams.get("ate");

  if (
    !rawFrom ||
    !rawTo ||
    !DATE_PATTERN.test(rawFrom) ||
    !DATE_PATTERN.test(rawTo)
  ) {
    return NextResponse.json(
      { error: "Informe um período válido (de/até)." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [from, to] =
    rawFrom <= rawTo ? [rawFrom, rawTo] : [rawTo, rawFrom];
  const report = await getReport(from, to);

  const header = [
    "Data",
    "Início",
    "Fim",
    "Cliente",
    "E-mail",
    "Telefone",
    "Serviços",
    "Duração (min)",
    "Status",
    "Pagamento",
    "Valor (R$)",
  ];

  const lines = [header.map(csvCell).join(";")];

  for (const appointment of report.items) {
    const services =
      appointment.items.length > 0
        ? appointment.items.map((item) => item.serviceName).join(" + ")
        : "—";
    lines.push(
      [
        appointment.startsOn,
        minutesToTime(appointment.startMinute),
        minutesToTime(appointment.endMinute),
        appointment.clientName,
        appointment.clientEmail,
        appointment.clientPhone ?? "",
        services,
        appointment.totalDurationMin,
        STATUS_LABELS[appointment.status],
        appointment.paymentStatus === "paid" ? "Pago" : "Pendente",
        csvMoney(appointment.totalPriceCents),
      ]
        .map(csvCell)
        .join(";"),
    );
  }

  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-aurora-${from}-a-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
