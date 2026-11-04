import { createElement } from "react";
import {
  Eye,
  Footprints,
  Hand,
  Scissors,
  Sparkles,
  Wand2,
  Waves,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícone por serviço, do mais específico para o mais genérico. O cardápio do
 * studio é de unhas, então cada tipo de atendimento tem o seu próprio símbolo:
 * pé, gel com brilho e mão. As regras seguintes só entram em ação se a
 * administração cadastrar um serviço com outro nome.
 */
const rules: { test: RegExp; icon: LucideIcon }[] = [
  { test: /pedicure|ped[ée]|p[ée]s|ded[oã]s/i, icon: Footprints },
  { test: /gel|cristal|porcelana|banheira|alongamento/i, icon: Sparkles },
  {
    test: /manicure|unha|esmalte|cutilage|cut[íi]cula|spa|m[ãa]os/i,
    icon: Hand,
  },
  { test: /sobrancelha|c[íi]lios|maquiagem|make/i, icon: Eye },
  { test: /corte|penteado|franja|escova|secagem|modelagem/i, icon: Scissors },
  { test: /colora|mecha|luzes|balayage|tonaliza/i, icon: Wand2 },
  { test: /hidrata|tratamento|nutri|botox|reconstru/i, icon: Waves },
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
