// UI-03: Percentuais do funil mais legíveis — badges destacados com fundo colorido,
// tipografia maior e espaçamento melhorado na tabela de conversão.

import { CalendarCheck, CheckCircle2, Heart, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Aggregated } from "@/lib/metrics";

function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return (numerator / denominator) * 100;
}

function formatRate(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

const STAGE_COLORS = [
  "var(--identity-blue)",
  "var(--identity-green)",
  "var(--identity-amber)",
  "var(--identity-pink)",
];
const STAGE_ICONS: LucideIcon[] = [Users, CalendarCheck, CheckCircle2, Heart];

const VIEW_W = 240;
const VIEW_H = 200;
const GAP = 4;
const BAND_COUNT = 4;
const BAND_H = (VIEW_H - GAP * (BAND_COUNT - 1)) / BAND_COUNT;
const FULL_WIDTH = VIEW_W * 0.86;
const MIN_WIDTH_RATIO = 0.22;
const CX = VIEW_W / 2;

function widthFor(value: number, max: number) {
  const ratio = max > 0 ? value / max : 0;
  return Math.max(MIN_WIDTH_RATIO, ratio) * FULL_WIDTH;
}

function trapezoidPoints(yTop: number, yBottom: number, topWidth: number, bottomWidth: number) {
  const topHalf = topWidth / 2;
  const bottomHalf = bottomWidth / 2;
  return [
    `${CX - topHalf},${yTop}`,
    `${CX + topHalf},${yTop}`,
    `${CX + bottomHalf},${yBottom}`,
    `${CX - bottomHalf},${yBottom}`,
  ].join(" ");
}

// Badge de percentual com fundo levemente colorido — mais legível que texto simples (UI-03)
function RateBadge({
  value,
  color,
  baseline,
}: {
  value: number | null;
  color: string;
  baseline?: boolean;
}) {
  const text = baseline ? "100%" : formatRate(value);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}
    >
      {text}
    </span>
  );
}

export function FunnelChart({ agg }: { agg: Aggregated }) {
  const stages = [
    { label: "Leads", value: agg.leads },
    { label: "Agendamentos", value: agg.appointments },
    { label: "Comparecimentos", value: agg.attendances },
    { label: "Fechamentos", value: agg.closings },
  ];
  const max = Math.max(1, agg.leads);
  const widths = stages.map((s) => widthFor(s.value, max));
  const overallRate = rate(agg.closings, agg.leads);

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-primary">Funil de conversão</h2>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* Trapézios SVG */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="mx-auto w-full max-w-[220px] shrink-0 sm:mx-0"
          role="img"
          aria-label="Funil de conversão"
        >
          {stages.map((stage, i) => {
            const yTop = i * (BAND_H + GAP);
            const yBottom = yTop + BAND_H;
            const topWidth = widths[i];
            const bottomWidth = i < stages.length - 1 ? widths[i + 1] : widths[i] * 0.55;
            return (
              <polygon
                key={stage.label}
                points={trapezoidPoints(yTop, yBottom, topWidth, bottomWidth)}
                fill={STAGE_COLORS[i]}
              />
            );
          })}
        </svg>

        {/* Tabela de etapas — UI-03: percentuais como badges coloridos */}
        <div className="min-w-0 flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted">
                <th className="pb-3 font-medium">Etapa</th>
                <th className="pb-3 font-medium tabular-nums">Qtd.</th>
                <th className="pb-3 font-medium">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((stage, i) => {
                const Icon = STAGE_ICONS[i];
                const conversionRate = i === 0
                  ? null
                  : rate(stage.value, stages[i - 1].value);

                return (
                  <tr key={stage.label} className="border-t border-border-hairline">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2 text-ink-secondary">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ background: STAGE_COLORS[i] }}
                        >
                          <Icon size={13} />
                        </span>
                        <span className="text-xs sm:text-sm">{stage.label}</span>
                      </div>
                    </td>
                    <td className="py-2.5 font-semibold tabular-nums text-ink-primary">
                      {stage.value}
                    </td>
                    <td className="py-2.5">
                      <RateBadge
                        value={conversionRate}
                        color={STAGE_COLORS[i]}
                        baseline={i === 0}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Taxa de no-show e remarcação */}
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border-hairline pt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-border-hairline px-2.5 py-1 text-xs text-ink-secondary">
              <span className="font-medium">No-show:</span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--status-serious)" }}>
                {formatRate(rate(agg.noShows, agg.appointments))}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-border-hairline px-2.5 py-1 text-xs text-ink-secondary">
              <span className="font-medium">Remarcou:</span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--status-warning)" }}>
                {formatRate(rate(agg.rescheduled, agg.appointments))}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé: taxa de conversão geral e faturamento */}
      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border-hairline pt-4">
        <div
          className="rounded-xl px-3 py-2"
          style={{ background: "color-mix(in srgb, var(--identity-blue) 10%, transparent)" }}
        >
          <p className="text-xs text-ink-secondary">Taxa de conversão geral</p>
          <p
            className="flex items-center gap-1 text-2xl font-bold"
            style={{ color: "var(--identity-blue)" }}
          >
            {formatRate(overallRate)}
            <TrendingUp size={18} />
          </p>
        </div>
        <div className="ml-auto text-xs text-ink-muted">
          Faturamento no período:{" "}
          <span className="font-medium text-ink-secondary">
            {agg.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      </div>
    </div>
  );
}
