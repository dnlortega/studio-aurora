import type { Metadata } from "next";
import { CalendarDays, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";

import { PasswordForm } from "@/components/painel/password-form";
import { ProfileForm } from "@/components/painel/profile-form";
import { FormAlert } from "@/components/shared/form-alert";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { formatDateInZone, formatPhoneInput } from "@/lib/dates";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Perfil e preferências" };

const profileErrors: Record<string, string> = {
  sessao: "Sua sessão expirou. Entre novamente para salvar as alterações.",
  dados: "Revise os campos destacados. Nada foi salvo.",
  limite: "Muitas alterações seguidas. Aguarde alguns minutos.",
};

const passwordErrors: Record<string, string> = {
  "senha-atual": "A senha atual informada não confere. Nada foi alterado.",
  sessao: "Sua sessão expirou. Entre novamente para trocar a senha.",
  credenciais: "Revise as senhas informadas. Nada foi alterado.",
  dados: "Revise as senhas informadas. Nada foi alterado.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    salvo?: string;
    senha?: string;
    erro?: string;
    erroSenha?: string;
  }>;
}) {
  const [user, settings, params] = await Promise.all([
    requireUser("/painel/perfil"),
    getSettings(),
    searchParams,
  ]);

  const memberSince = formatDateInZone(user.createdAt, settings.timezone);

  const profileMessage = params.erro
    ? (profileErrors[params.erro] ?? profileErrors.dados)
    : undefined;
  const passwordMessage = params.erroSenha
    ? (passwordErrors[params.erroSenha] ?? passwordErrors.dados)
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Minha conta"
        title="Perfil e preferências"
        description="Mantenha seus dados atualizados para que o salão consiga falar com você e preparar o atendimento."
      />

      {params.salvo ? (
        <FormAlert tone="success" message="Seus dados foram atualizados." />
      ) : null}

      {params.senha ? (
        <FormAlert
          tone="success"
          message="Senha alterada. As outras sessões abertas foram encerradas; só este dispositivo continua conectado."
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <UserRound className="size-4 text-muted-foreground" />
                Dados pessoais
              </CardTitle>
              <CardDescription className="text-xs">
                Seu nome e telefone são usados apenas para o atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileMessage ? (
                <FormAlert
                  tone="error"
                  message={profileMessage}
                  className="mb-4"
                />
              ) : null}
              <ProfileForm
                defaults={{
                  name: user.name,
                  phone: formatPhoneInput(user.phone ?? ""),
                  notifyEmail: user.notifyEmail,
                  notifyWhatsapp: user.notifyWhatsapp,
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Lock className="size-4 text-muted-foreground" />
                Segurança
              </CardTitle>
              <CardDescription className="text-xs">
                Ao trocar a senha, todas as outras sessões abertas são encerradas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {passwordMessage ? (
                <FormAlert
                  tone="error"
                  message={passwordMessage}
                  className="mb-4"
                />
              ) : null}
              <PasswordForm />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">E-mail de acesso</p>
                  <p className="break-all">{user.email}</p>
                  <p className="mt-1 text-[0.68rem] text-muted-foreground">
                    Para alterar o e-mail, fale com o salão.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Cliente desde
                  </p>
                  <p className="tabular-nums">{memberSince}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/40">
            <CardContent className="space-y-2 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-1.5 font-medium text-foreground">
                <ShieldCheck className="size-3.5" />
                Sua privacidade
              </p>
              <p>
                Seus agendamentos são privados. Nenhum outro cliente consegue
                ver seus horários, telefone ou e-mail. O acesso administrativo é
                restrito à equipe autorizada do salão.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
