import Link from "next/link";
import { AtSign, Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { getDb } from "@/lib/db";
import { businessHours } from "@/lib/db/schema";
import { minutesToTime, weekdayShort } from "@/lib/dates";
import { getSettings } from "@/lib/settings";

export async function SiteFooter() {
  const settings = await getSettings();
  const db = await getDb();
  const hours = await db.select().from(businessHours);
  const openDays = hours
    .filter((day) => day.isOpen)
    .sort((a, b) => a.weekday - b.weekday);

  const whatsappDigits = settings.whatsapp?.replace(/\D/g, "");

  return (
    <footer className="mt-20 border-t border-border/70 bg-secondary/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo name={settings.salonName} />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty">
            {settings.description ??
              "Um estúdio de unhas pensado para cuidar de você com calma, técnica e atenção aos detalhes."}
          </p>
          {settings.instagram ? (
            <a
              href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <AtSign className="size-4" />
              @{settings.instagram.replace("@", "")}
            </a>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="eyebrow">Navegue</p>
          <nav className="flex flex-col gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Agendar horário
            </Link>
            <Link href="/servicos" className="text-muted-foreground hover:text-foreground">
              Serviços e preços
            </Link>
            <Link href="/painel" className="text-muted-foreground hover:text-foreground">
              Meus agendamentos
            </Link>
            <Link href="/entrar" className="text-muted-foreground hover:text-foreground">
              Entrar na conta
            </Link>
          </nav>
        </div>

        <div className="space-y-3">
          <p className="eyebrow">Contato</p>
          <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
            {settings.address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                <span>{settings.address}</span>
              </li>
            ) : null}
            {settings.phone ? (
              <li>
                <a
                  href={`tel:${settings.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-2 hover:text-foreground"
                >
                  <Phone className="size-4 shrink-0" />
                  {settings.phone}
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <a
                  href={`mailto:${settings.email}`}
                  className="flex items-center gap-2 break-all hover:text-foreground"
                >
                  <Mail className="size-4 shrink-0" />
                  {settings.email}
                </a>
              </li>
            ) : null}
            {whatsappDigits ? (
              <li>
                <a
                  href={`https://wa.me/55${whatsappDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Falar no WhatsApp
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="eyebrow">Horários</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {openDays.length === 0 ? (
              <li className="text-muted-foreground">
                Consulte os horários pelo WhatsApp.
              </li>
            ) : (
              openDays.map((day) => (
                <li
                  key={day.weekday}
                  className="flex items-center justify-between gap-3 text-muted-foreground"
                >
                  <span>{weekdayShort(day.weekday)}</span>
                  <span className="tabular-nums">
                    {minutesToTime(day.openMinute)}–{minutesToTime(day.closeMinute)}
                  </span>
                </li>
              ))
            )}
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            Atendimento com agendamento.
          </p>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.salonName}. Todos os direitos
            reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground">
              Agendamento online
            </Link>
            <Link href="/admin" className="hover:text-foreground">
              Área do salão
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
