import { NextResponse, type NextRequest } from "next/server";

import {
  BookingError,
  getMonthAvailability,
  resolveAvailability,
} from "@/lib/booking/service";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  if (
    !rateLimit(rateLimitKey("availability", ip), {
      limit: 120,
      windowMs: 60_000,
    }).allowed
  ) {
    return json({ error: "Muitas consultas. Aguarde um instante." }, 429);
  }

  const params = request.nextUrl.searchParams;
  const serviceIds = (params.get("servicos") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (serviceIds.length === 0 || serviceIds.length > 6) {
    return json({ error: "Selecione de 1 a 6 serviços." }, 400);
  }
  if (!serviceIds.every((id) => UUID.test(id))) {
    return json({ error: "Serviço inválido." }, 400);
  }

  const month = params.get("mes");
  const day = params.get("data");

  try {
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return json({ error: "Mês inválido." }, 400);
      }
      const result = await getMonthAvailability({ month, serviceIds });
      return json(result);
    }

    if (day) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        return json({ error: "Data inválida." }, 400);
      }

      // Somente o admin pode ignorar um agendamento existente (reagendamento):
      // isso evita que o próprio horário atual bloqueie a consulta.
      const ignore = params.get("ignorar");
      let ignoreAppointmentId: string | undefined;
      if (ignore && UUID.test(ignore)) {
        const user = await getCurrentUser();
        if (user?.role === "admin") ignoreAppointmentId = ignore;
      }

      const result = await resolveAvailability({
        day,
        serviceIds,
        ignoreAppointmentId,
      });
      return json(result);
    }

    return json({ error: "Informe mes ou data." }, 400);
  } catch (error) {
    if (error instanceof BookingError) {
      return json({ error: error.message, code: error.code }, 409);
    }
    console.error("[api/disponibilidade]", error);
    return json({ error: "Não foi possível consultar a agenda." }, 500);
  }
}
