import { createElement } from "react";
import {
  Brush,
  Eye,
  Hand,
  Scissors,
  Sparkles,
  Wand2,
  Waves,
  type LucideIcon,
} from "lucide-react";

const rules: { test: RegExp; icon: LucideIcon }[] = [
  { test: /corte|penteado|franja/i, icon: Scissors },
  { test: /colora|mecha|luzes|balayage|tonaliza/i, icon: Wand2 },
  { test: /manicure|pedicure|unha|esmalte/i, icon: Hand },
  { test: /sobrancelha|cílios|maquiagem|make/i, icon: Eye },
  { test: /hidrata|tratamento|nutri|botox|reconstru/i, icon: Waves },
  { test: /escova|secagem|modelagem/i, icon: Brush },
];

export function serviceIcon(name: string): LucideIcon {
  return rules.find((rule) => rule.test.test(name))?.icon ?? Sparkles;
}

/**
 * Ícone do serviço já montado como elemento. Prefira esta função a chamar
 * `serviceIcon()` e usar o resultado como JSX dentro do render: o lint entende
 * que um componente está sendo criado durante a renderização, o que reinicia o
 * estado a cada passada (`react-hooks/static-components`).
 */
export function renderServiceIcon(name: string, className?: string) {
  return createElement(serviceIcon(name), {
    className,
    "aria-hidden": true,
  });
}
