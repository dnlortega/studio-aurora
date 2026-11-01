"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type TooltipSide = "top" | "bottom" | "left" | "right";

/**
 * Botão apenas com ícone.
 *
 * A interface não mostra texto, mas a ação continua nomeada: `aria-label`
 * garante o nome acessível (leitores de tela e testes por role) e o tooltip
 * devolve a informação visual para quem passa o mouse ou foca pelo teclado.
 */
export function IconButton({
  label,
  tooltipSide = "top",
  className,
  size = "icon",
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  tooltipSide?: TooltipSide;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size={size}
            aria-label={label}
            className={cn(className)}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Link estilizado como botão, também apenas com ícone + tooltip. */
export function IconLink({
  label,
  href,
  tooltipSide = "top",
  className,
  size = "icon",
  variant = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "className"> & {
  label: string;
  tooltipSide?: TooltipSide;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Botão de envio apenas com ícone. Durante a ação (`pending`) o ícone vira
 * spinner e o botão fica desabilitado — o nome acessível permanece o mesmo.
 */
export function IconSubmitButton({
  label,
  pending = false,
  icon,
  spinner,
  tooltipSide = "top",
  className,
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  pending?: boolean;
  icon: React.ReactNode;
  spinner?: React.ReactNode;
  tooltipSide?: TooltipSide;
}) {
  return (
    <IconButton
      label={label}
      tooltipSide={tooltipSide}
      size={size}
      type="submit"
      aria-busy={pending || undefined}
      disabled={pending || props.disabled}
      className={className}
      {...props}
    >
      {pending ? (spinner ?? <Loader2 className="size-4 animate-spin" />) : icon}
    </IconButton>
  );
}

