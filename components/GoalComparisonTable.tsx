import { AlertTriangle, CheckCircle2, MinusCircle, XCircle, type LucideIcon } from "lucide-react";
import { Goal, MetricKey } from "@/lib/types";
import { colorForMetric, formatMetricValue, MetricComparison, METRIC_META } from "@/lib/metrics";

const ALL_METRIC_KEYS = Object.keys(METRIC_META) as MetricKey[];

const STATUS_META: Record<string, { label: string; icon: LucideIcon; cssVar: string }> = {
  green: { label: "Na meta", icon: CheckCircle2, cssVar: "var(--status-good)" },
  yellow: { label: "Atenção", icon: AlertTriangle, cssVar: "var(--status-warning)" },
  red: { label: "Abaixo", icon: XCircle, cssVar: "var(--status-critical)" },
  neutral: { label: "Sem meta", icon: MinusCircle, cssVar: "var(--ink-muted)" },
};

function StatusPill({ color }: { color: string }) {
  const status = STATUS_META[color];
  const Icon = status.icon;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color: status.cssVar, background: `color-mix(in srgb, ${status.cssVar} 12%, transparent)` }}
    >
      <Icon size={12} />
      {status.label}
    </span>
  );
}

export function GoalComparisonTable({
  metrics,
  goals,
  comparison,
}: {
  metrics: Record<MetricKey, number | null>;
  goals: Record<string, Goal>;
  comparison?: Record<MetricKey, MetricComparison>;
}) {
  const rows = ALL_METRIC_KEYS.map((key) => {
    const value = metrics[key];
    const goal = goals[key];
    const color = colorForMetric(value, goal);
    const delta = comparison?.[key]?.deltaPct ?? null;
    return { key, value, goal, color, delta };
  });

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
      {/* Mobile: card list */}
      <div className="divide-y divide-border-hairline sm:hidden">
        {rows.map((row) => (
          <div key={row.key} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-primary">
                {METRIC_META[row.key].label}
              </span>
              <StatusPill color={row.color} />
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm tabular-nums">
              <span className="text-ink-secondary">
                Atual <span className="font-semibold text-ink-primary">{formatMetricValue(row.key, row.value)}</span>
              </span>
              <span className="text-ink-secondary">
                Meta{" "}
                <span className="font-medium">
                  {row.goal?.target_value === null || row.goal?.target_value === undefined
                    ? "—"
                    : formatMetricValue(row.key, row.goal.target_value)}
                </span>
              </span>
              {row.delta !== null && (
                <span className="text-ink-secondary">
                  {row.delta! >= 0 ? "+" : ""}
                  {row.delta!.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-ink-muted">
              <th className="px-4 py-3 font-medium">Métrica</th>
              <th className="px-4 py-3 font-medium">Atual</th>
              <th className="px-4 py-3 font-medium">Meta</th>
              {comparison && <th className="px-4 py-3 font-medium">Variação</th>}
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border-hairline last:border-0">
                <td className="px-4 py-3 text-ink-secondary">{METRIC_META[row.key].label}</td>
                <td className="px-4 py-3 font-medium tabular-nums text-ink-primary">
                  {formatMetricValue(row.key, row.value)}
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">
                  {row.goal?.target_value === null || row.goal?.target_value === undefined
                    ? "—"
                    : formatMetricValue(row.key, row.goal.target_value)}
                </td>
                {comparison && (
                  <td className="px-4 py-3 tabular-nums text-ink-secondary">
                    {row.delta === null
                      ? "—"
                      : `${row.delta >= 0 ? "+" : ""}${row.delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                  </td>
                )}
                <td className="px-4 py-3">
                  <StatusPill color={row.color} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
