import { ArrowDown, ArrowUp, CalendarCheck, Receipt, TrendingUp, Users, Wallet, type LucideIcon } from "lucide-react";
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
            className="min-w-0 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${identityVar} 14%, transparent)`, color: identityVar }}
            >
              <Icon size={16} />
            </span>
            <p className="mt-3 text-xs text-ink-secondary">{METRIC_META[key].label}</p>
            <p className="mt-0.5 truncate text-xl font-semibold text-ink-primary sm:text-2xl">
              {formatMetricValue(key, value)}
            </p>
            {delta !== null && (
              <p
                className="mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium"
                style={{
                  color: isGoodDelta ? "var(--status-good)" : "var(--status-critical)",
                  background: `color-mix(in srgb, ${isGoodDelta ? "var(--status-good)" : "var(--status-critical)"} 12%, transparent)`,
                }}
              >
                {delta >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </p>
            )}
            {series && series.length >= 2 && (
              <div className="mt-2">
                <Sparkline values={series} color={identityVar} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
