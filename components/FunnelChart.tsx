import { ArrowDown } from "lucide-react";
import { Aggregated } from "@/lib/metrics";

function rate(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

const STAGE_COLORS = ["var(--funnel-1)", "var(--funnel-2)", "var(--funnel-3)", "var(--funnel-4)"];

export function FunnelChart({ agg }: { agg: Aggregated }) {
  const stages = [
    { label: "Leads", value: agg.leads },
    { label: "Agendamentos", value: agg.appointments },
    { label: "Comparecimentos", value: agg.attendances },
    { label: "Fechamentos", value: agg.closings },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-primary">Funil</h2>

      <div className="mt-5 flex flex-col">
        {stages.map((stage, i) => {
          const widthPct = Math.max(6, (stage.value / max) * 100);
          const color = STAGE_COLORS[i];

          return (
            <div key={stage.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-ink-secondary">{stage.label}</span>
                <span className="text-xl font-semibold text-ink-primary">{stage.value}</span>
              </div>
              <div
                className="mt-1.5 h-3 w-full overflow-hidden rounded-full"
                style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${widthPct}%`, background: color }}
                />
              </div>

              {i < stages.length - 1 && (
                <div className="my-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <ArrowDown size={13} />
                    <span className="font-medium text-ink-secondary">
                      {rate(stages[i + 1].value, stage.value)}
                    </span>
                    <span>de conversão</span>
                  </span>
                  {i === 1 && (
                    <span>
                      no-show {rate(agg.noShows, agg.appointments)} · cancelou/remarcou{" "}
                      {rate(agg.rescheduled, agg.appointments)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border-hairline pt-3 text-xs text-ink-muted">
        Faturamento no período:{" "}
        <span className="font-medium text-ink-secondary">
          {agg.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>
    </div>
  );
}
