// UI-02: Cards de métricas com design melhorado — tipografia mais clara,
// hierarquia visual aprimorada, espaçamento corrigido.

import { Banknote, DollarSign, Target, Wallet, type LucideIcon } from "lucide-react";
import { Goal } from "@/lib/types";
import { colorForMetric, formatMetricValue } from "@/lib/metrics";

const STATUS_VAR: Record<string, string> = {
  green: "var(--status-good)",
  yellow: "var(--status-warning)",
  red: "var(--status-critical)",
  neutral: "var(--brand-solid)",
};

function currency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function HeroSummary({
  investment,
  revenue,
  closings,
  cac,
  cacGoal,
}: {
  investment: number;
  revenue: number;
  closings: number;
  cac: number | null;
  cacGoal?: Goal;
}) {
  const cacColor = STATUS_VAR[colorForMetric(cac, cacGoal)];

  const items: { label: string; sublabel: string; value: string; icon: LucideIcon; color: string }[] = [
    {
      label: "Investimento",
      sublabel: "total no período",
      value: currency(investment),
      icon: Wallet,
      color: "var(--brand-solid)",
    },
    {
      label: "Faturamento",
      sublabel: "total no período",
      value: currency(revenue),
      icon: Banknote,
      color: "var(--identity-green)",
    },
    {
      label: "Fechamentos",
      sublabel: "novos contratos",
      value: String(closings),
      icon: Target,
      color: "var(--identity-blue)",
    },
    {
      label: "CAC",
      sublabel: "custo por cliente",
      value: formatMetricValue("cac", cac),
      icon: DollarSign,
      color: cacColor,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="group min-w-0 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
        >
          {/* Ícone com fundo colorido levemente tintado */}
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
              color: item.color,
            }}
          >
            <item.icon size={17} strokeWidth={2} />
          </span>

          {/* Label com sublabel para contexto adicional */}
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
              {item.label}
            </p>
            <p className="text-xs text-ink-secondary">{item.sublabel}</p>
          </div>

          {/* Valor principal — tamanho aumentado para hierarquia visual */}
          <p
            className="mt-2 truncate text-2xl font-bold tabular-nums text-ink-primary sm:text-3xl"
            style={{ color: item.color !== "var(--brand-solid)" && item.color !== "var(--identity-green)" && item.color !== "var(--identity-blue)" ? item.color : undefined }}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
