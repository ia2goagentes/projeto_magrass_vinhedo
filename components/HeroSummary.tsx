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

  const items: { label: string; value: string; icon: LucideIcon; color: string }[] = [
    { label: "Investimento total", value: currency(investment), icon: Wallet, color: "var(--brand-solid)" },
    { label: "Faturamento total", value: currency(revenue), icon: Banknote, color: "var(--brand-solid)" },
    { label: "Fechamentos", value: String(closings), icon: Target, color: "var(--brand-solid)" },
    { label: "CAC", value: formatMetricValue("cac", cac), icon: DollarSign, color: cacColor },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm sm:p-5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: `color-mix(in srgb, ${item.color} 14%, transparent)`, color: item.color }}
          >
            <item.icon size={17} />
          </span>
          <p className="mt-3 text-xs text-ink-secondary">{item.label}</p>
          <p className="mt-0.5 truncate text-xl font-bold text-ink-primary sm:text-3xl">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
