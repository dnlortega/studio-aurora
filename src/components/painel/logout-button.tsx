"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/shared/icon-button";

export function LogoutButton({
  className,
  variant = "ghost",
  label: labelProp,
  showLabel,
}: {
  className?: string;
  variant?: "ghost" | "outline";
  label?: string;
  showLabel?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const label = labelProp ?? "Sair";

  const handleClick = () => startTransition(() => void logoutAction());

  // Por padrão o botão renderiza apenas o ícone (nome "Sair" preservado em
  // aria-label/tooltip). Chamadores que passam `label` explícito — as barras
  // de navegação inferiores do painel/admin — mantêm o texto, pois são itens
  // de navegação em coluna, não botões.
  const withText = showLabel ?? labelProp !== undefined;

  if (!withText) {
    return (
      <IconButton
        label={label}
        variant={variant}
        type="button"
        className={className}
        disabled={pending}
        onClick={handleClick}
      >
        <LogOut className="size-4" />
      </IconButton>
    );
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={pending}
      onClick={handleClick}
    >
      <LogOut className="size-4" />
      {pending ? "Saindo…" : label}
    </Button>
  );
}
