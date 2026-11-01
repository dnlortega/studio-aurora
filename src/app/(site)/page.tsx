import type { Metadata } from "next";
import {
  CalendarDays,
  Check,
  Clock3,
  Leaf,
  MapPin,
  MessageCircle,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { IconLink } from "@/components/shared/icon-button";
import { ServiceCard } from "@/components/site/service-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/lib/db";
import { businessHours } from "@/lib/db/schema";
import {
  formatCurrency,
  formatDayLong,
  formatDuration,
  minutesToTime,
  weekdayName,
} from "@/lib/dates";
import { getActiveServices, getNextAvailability } from "@/lib/booking/service";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Studio Aurora — Beleza que respeita o seu tempo",
};

const steps = [
  {
    title: "Escolha os serviços",
    description:
      "Monte o seu ritual: corte, cor, unhas ou skincare. Veja preço e duração na hora.",
    icon: Sparkles,
  },
  {
    title: "Encontre seu horário",
    description:
      "O calendário mostra apenas o que está realmente livre, com a duração certa.",
    icon: CalendarDays,
  },
  {
    title: "Confirme em segundos",
    description:
      "Entre ou crie sua conta sem perder a seleção. A confirmação é imediata.",
    icon: ShieldCheck,
  },
  {
    title: "Acompanhe tudo",
    description:
      "Reagende ou cancele pelo painel, respeitando as regras do salão.",
    icon: Clock3,
  },
];

export default async function HomePage() {
  const [settings, services, next, hours] = await Promise.all([
    getSettings(),
    getActiveServices(),
    getNextAvailability(),
    getDb().then((db) => db.select().from(businessHours)),
  ]);

  const highlights = services.slice(0, 4);
  const openDays = hours
    .filter((day) => day.isOpen)
    .sort((a, b) => a.weekday - b.weekday);

  return (
    <div className="overflow-hidden">
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(90%_80%_at_85%_0%,#f1dfd1_0%,transparent_55%),radial-gradient(70%_60%_at_5%_20%,#f6eee3_0%,transparent_60%)]" />
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
          <div className="max-w-xl space-y-7">
            <Badge
              variant="outline"
              className="gap-2 rounded-full border-primary/20 bg-background/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              Agenda aberta para novos horários
            </Badge>

            <h1 className="text-balance text-[2.6rem] leading-[1.04] font-medium sm:text-6xl lg:text-[4.1rem]">
              Beleza que respeita
              <br className="hidden sm:block" /> o{" "}
              <em className="font-light text-primary italic">seu tempo</em>.
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              No {settings.salonName}, você escolhe o serviço, encontra o
              horário livre e confirma em poucos passos — sem ligações, sem
              espera.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <IconLink href="/agendar" label="Agendar meu horário" size="icon-lg">
                <CalendarDays className="size-5" />
              </IconLink>
              <IconLink
                href="/servicos"
                label="Ver serviços e preços"
                variant="outline"
                size="icon-lg"
              >
                <Scissors className="size-5" />
              </IconLink>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {["Confirmação na hora", "Cancele pelo site", "Sem fila de espera"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-primary" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[27rem] lg:max-w-[30rem]">
            <div className="absolute -inset-8 -z-10 rounded-full bg-[#e7c9b3]/30 blur-3xl" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.4rem] border border-white/60 bg-gradient-to-br from-[#f0dfcf] via-[#f7eee3] to-[#e8d2c0] shadow-[0_40px_80px_-50px_rgba(70,40,20,0.5)]">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(120,80,55,0.18) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="absolute -right-14 -top-20 size-72 rounded-full border border-white/60" />
              <div className="absolute -right-2 -top-8 size-52 rounded-full border border-white/50" />
              <div className="absolute -left-12 top-1/3 size-44 rounded-full bg-[#cfa78f]/25 blur-2xl" />

              <div className="absolute inset-x-5 top-5 flex items-center justify-between">
                <span className="rounded-full border border-white/50 bg-white/40 px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-[#6b4f3f] backdrop-blur">
                  {settings.salonName}
                </span>
                <span className="rounded-full bg-[#6d4c3a] px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-white">
                  agenda online
                </span>
              </div>

              <div className="absolute inset-x-5 top-[16%] space-y-3 px-1 text-[#4b3327] sm:px-3">
                <p className="font-heading text-[1.75rem] leading-tight text-balance sm:text-3xl">
                  Um horário só seu,
                  <br />
                  no seu ritmo.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["Corte", "Cor", "Unhas", "Skincare"].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#8a6a57]/25 bg-white/35 px-2.5 py-1 text-[0.65rem] text-[#5a4033] backdrop-blur"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-xl backdrop-blur-md sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {next ? "Próximo horário livre" : "Agenda"}
                    </p>
                    <p className="mt-1 font-heading text-lg font-medium first-letter:uppercase">
                      {next
                        ? formatDayLong(next.day)
                        : "Consulte os horários"}
                    </p>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <CalendarDays className="size-4" />
                  </span>
                </div>

                {next ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {next.slots.map((slot, index) => (
                        <span
                          key={slot}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs tabular-nums",
                            index === 0
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {minutesToTime(slot)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {next.serviceName}
                        </p>
                        <p className="text-[0.7rem] text-muted-foreground">
                          {formatDuration(next.durationMin)} ·{" "}
                          {formatCurrency(next.priceCents)}
                        </p>
                      </div>
                      <IconLink
                        href={`/agendar?servico=${next.serviceId}`}
                        label="Reservar"
                        size="icon-sm"
                        className="shrink-0"
                        tooltipSide="left"
                      >
                        <Check className="size-3.5" />
                      </IconLink>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Estamos organizando a agenda. Fale com o salão para
                    combinar um horário.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/35">
        <div className="container-page grid gap-6 py-7 sm:grid-cols-3">
          {[
            {
              icon: Clock3,
              title: "Horários reais",
              text: "A agenda respeita duração, intervalos e bloqueios do salão.",
            },
            {
              icon: ShieldCheck,
              title: "Reserva protegida",
              text: "Seus horários são privados e só você os acessa.",
            },
            {
              icon: Leaf,
              title: "Cuidado sem pressa",
              text: "Tempo reservado só para você, do começo ao fim.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/15 bg-background text-primary">
                <item.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="servicos" className="container-page py-16 lg:py-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-lg space-y-2">
            <p className="eyebrow">Nossos serviços</p>
            <h2 className="text-3xl font-medium text-balance sm:text-4xl">
              Rituais pensados para cada detalhe
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              Preço e duração transparentes. Escolha um ou combine serviços —
              a agenda calcula o tempo total para você.
            </p>
          </div>
          <IconLink
            href="/servicos"
            label="Ver catálogo completo"
            variant="outline"
            size="icon-sm"
            tooltipSide="left"
          >
            <Scissors className="size-3.5" />
          </IconLink>
        </div>

        {highlights.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <p className="font-medium">Catálogo em preparação</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os serviços serão exibidos aqui assim que forem cadastrados no
              painel do salão.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      <section id="sobre" className="relative overflow-hidden bg-[#2b1e18] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(80%_100%_at_90%_0%,#5a4032_0%,transparent_60%)]" />
        <div className="absolute -right-24 -top-28 size-[420px] rounded-full border border-white/10" />
        <div className="absolute -right-6 -top-8 size-[280px] rounded-full border border-white/10" />
        <div className="container-page relative grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="max-w-lg space-y-6">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/50">
              O studio
            </p>
            <h2 className="text-3xl font-medium text-balance sm:text-4xl">
              Um ritual de cuidado, do começo ao fim
            </h2>
            <p className="text-sm leading-relaxed text-white/70 text-pretty sm:text-base">
              {settings.description ??
                "Acreditamos que beleza é presença. Por isso, cada atendimento é reservado com tempo de sobra: para ouvir você, entender o seu dia a dia e criar algo que faça sentido na sua rotina."}
            </p>
            <ul className="grid gap-3 text-sm text-white/80 sm:grid-cols-2">
              {[
                "Atendimento individual",
                "Produtos profissionais",
                "Ambiente acolhedor",
                "Agenda sem correria",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full border border-white/20 bg-white/5">
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <IconLink
              href="/agendar"
              label="Reservar meu momento"
              variant="secondary"
              size="icon-lg"
              className="bg-white text-[#2b1e18] hover:bg-white/90"
              tooltipSide="right"
            >
              <Check className="size-5" />
            </IconLink>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.04] p-8 backdrop-blur-sm sm:p-10">
              <div className="absolute -right-16 -top-16 size-48 rounded-full border border-white/10" />
              <div className="absolute -right-8 -top-8 size-32 rounded-full border border-white/10" />
              <Sparkles className="size-5 text-[#d8b097]" />
              <blockquote className="mt-6 font-heading text-3xl leading-[1.25] text-balance sm:text-[2.1rem]">
                “A beleza começa quando você se sente bem no próprio tempo.”
              </blockquote>
              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/50">
                <span>{settings.salonName}</span>
                <span>
                  {openDays.length > 0
                    ? `${weekdayName(openDays[0].weekday)} a ${
                        weekdayName(openDays[openDays.length - 1].weekday)
                      }`
                    : "Consulte a agenda"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16 lg:py-24">
        <div className="max-w-lg space-y-2">
          <p className="eyebrow">Como funciona</p>
          <h2 className="text-3xl font-medium text-balance sm:text-4xl">
            Quatro passos até o seu horário
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <span className="font-heading text-2xl text-primary/60">
                  0{index + 1}
                </span>
                <step.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <Card className="overflow-hidden border-border/80 bg-card">
          <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:p-10">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="eyebrow">Visite o studio</p>
                <h2 className="text-2xl font-medium sm:text-3xl">
                  Um café, boa conversa e o seu horário reservado
                </h2>
              </div>
              <ul className="space-y-3 text-sm">
                {settings.address ? (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">
                      {settings.address}
                    </span>
                  </li>
                ) : null}
                {settings.phone ? (
                  <li className="flex items-center gap-2.5">
                    <Phone className="size-4 shrink-0 text-primary" />
                    <a
                      href={`tel:${settings.phone.replace(/\s/g, "")}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {settings.phone}
                    </a>
                  </li>
                ) : null}
                <li className="flex items-start gap-2.5">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    Atendimento somente com agendamento, para garantir o seu
                    tempo.
                  </span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <IconLink href="/agendar" label="Agendar agora" size="icon-sm">
                  <CalendarDays className="size-3.5" />
                </IconLink>
                {settings.whatsapp ? (
                  <IconLink
                    href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    label="Falar no WhatsApp"
                    variant="outline"
                    size="icon-sm"
                  >
                    <MessageCircle className="size-3.5" />
                  </IconLink>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-secondary/30 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Horário de funcionamento
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {openDays.length > 0 ? (
                  openDays.map((day) => (
                    <li
                      key={day.weekday}
                      className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span>{weekdayName(day.weekday)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {minutesToTime(day.openMinute)} –{" "}
                        {minutesToTime(day.closeMinute)}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground">
                    Horários em atualização. Consulte pelo WhatsApp.
                  </li>
                )}
              </ul>
              {settings.publicNotice ? (
                <p className="mt-4 rounded-lg bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
                  {settings.publicNotice}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
