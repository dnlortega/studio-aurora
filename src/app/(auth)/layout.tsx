import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[#2b1e18] text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(120%_110%_at_15%_0%,#936a55_0%,#4a342a_42%,#241812_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -right-24 top-10 size-[460px] rounded-t-full border border-white/15" />
        <div className="absolute -right-2 top-32 size-[300px] rounded-t-full border border-white/10" />
        <div className="absolute -left-20 bottom-10 size-72 rounded-full bg-[#c89a7e]/20 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <Logo name={settings.salonName} light />

          <div className="max-w-md space-y-7">
            <span className="block h-px w-16 bg-white/30" />
            <blockquote className="font-heading text-4xl leading-[1.15] text-balance xl:text-[2.7rem]">
              “Suas unhas cuidadas com o tempo que elas pedem.”
            </blockquote>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Agenda organizada, atendimento sem pressa e um espaço pensado
              para você respirar. Bem-vinda ao {settings.salonName}.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/50">
            <span>Agendamento online</span>
            <span className="size-1 rounded-full bg-white/30" />
            <span>Confirmação imediata</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-svh flex-col bg-background">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Logo name={settings.salonName} />
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Voltar ao site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <div className="hidden justify-center p-5 text-center text-xs text-muted-foreground lg:flex">
          <Link href="/" className="hover:text-foreground">
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
