// UI-02: Cards de métricas de custo redesenhados com:
// - Label em uppercase tracking-wider para hierarquia visual clara
// - Valor em fonte maior com tabular-nums
// - Badge de delta mais compacto
// - Sparkline com padding consistente

import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { MetricKey, Goal } from "@/lib/types";
import { formatMetricValue, MetricComparison, METRIC_META } from "@/lib/metrics";
import { Sparkline } from "@/components/Sparkline";

const COST_CARD_KEYS: MetricKey[] = ["cpl", "cpa", "cac", "avg_ticket", "roas"];

const METRIC_ICONS: Record<string, LucideIcon> = {
  cpl: Users,
  cpa: CalendarCheck,
  cac: Wallet,
  avg_ticket: Receipt,
  roas: TrendingUp,
};

// Labels curtos para os cards (evita quebra de linha em telas pequenas)
const METRIC_SHORT_LABEL: Partial<Record<MetricKey, string>> = {
  cpl: "CPL",
  cpa: "CPA",
  cac: "CAC",
  avg_ticket: "Ticket médio",
  roas: "ROAS",
};

const IDENTITY_VAR: Record<string, string> = {
  cpl: "var(--identity-blue)",
  cpa: "var(--identity-green)",
  cac: "var(--identity-teal)",
  avg_ticket: "var(--identity-amber)",
  roas: "var(--identity-pink)",
};

export function CostMetricCards({
  metrics,
  goals,
  comparison,
  sparklines,
}: {
  metrics: Record<MetricKey, number | null>;
  goals: Record<string, Goal>;
  comparison?: Record<MetricKey, MetricComparison>;
  sparklines?: Partial<Record<MetricKey, number[]>>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {COST_CARD_KEYS.map((key) => {
        const value = metrics[key];
        const identityVar = IDENTITY_VAR[key];
        const Icon = METRIC_ICONS[key];
        const delta = comparison?.[key]?.deltaPct ?? null;
        const isGoodDelta =
          delta === null
            ? null
            : goals[key]?.direction === "lower_is_better"
              ? delta <= 0
              : delta >= 0;
        const series = sparklines?.[key];

        return (
          <div
            key={key}
            className="group min-w-0 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {/* Ícone */}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in srgb, ${identityVar} 12%, transparent)`,
                color: identityVar,
              }}
            >
              <Icon size={15} strokeWidth={2} />
            </span>

            {/* Label com nome curto em uppercase (UI-02: hierarquia visual) */}
            <div className="mt-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: identityVar }}
              >
                {METRIC_SHORT_LABEL[key] ?? key.toUpperCase()}
              </p>
              <p className="mt-0.5 text-xs leading-tight text-ink-secondary">
                {METRIC_META[key].label.split("(")[0].trim()}
              </p>
            </div>

            {/* Valor principal */}
            <p className="mt-1.5 truncate text-xl font-bold tabular-nums text-ink-primary sm:text-2xl">
              {formatMetricValue(key, value)}
            </p>

            {/* Badge de variação vs período anterior */}
            {delta !== null && (
              <p
                className="mt-1.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{
                  color: isGoodDelta ? "var(--status-good)" : "var(--status-critical)",
                  background: `color-mix(in srgb, ${isGoodDelta ? "var(--status-good)" : "var(--status-critical)"} 10%, transparent)`,
                }}
              >
                {delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </p>
            )}

            {/* Sparkline (DASH-04: série corrigida pelo hook) */}
            {series && series.length >= 2 && (
              <div className="mt-3 border-t border-border-hairline pt-2">
                <Sparkline values={series} color={identityVar} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
