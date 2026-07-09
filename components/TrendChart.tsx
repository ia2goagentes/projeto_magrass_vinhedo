"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bucket, computeFunnelMetrics, METRIC_META } from "@/lib/metrics";
import { MetricKey } from "@/lib/types";

const TREND_METRIC_KEYS: MetricKey[] = [
  "lead_to_appointment_rate",
  "attendance_rate",
  "lead_to_closing_rate",
];

const LINE_COLORS: Record<string, string> = {
  lead_to_appointment_rate: "var(--chart-blue)",
  attendance_rate: "var(--chart-aqua)",
  lead_to_closing_rate: "var(--chart-violet)",
};

type TooltipEntry = { dataKey?: string; value?: number; color?: string };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border-hairline bg-surface-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-ink-secondary">
              {METRIC_META[entry.dataKey as MetricKey]?.label}
            </span>
            <span className="ml-auto font-semibold text-ink-primary">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type LegendEntry = { value?: string; color?: string };

function ChartLegend({ payload }: { payload?: LegendEntry[] }) {
  if (!payload?.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {payload.map((entry) => (
        <span
          key={entry.value}
          className="flex items-center gap-1.5 rounded-full border border-border-hairline px-2.5 py-1 text-xs font-medium text-ink-secondary"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          {METRIC_META[entry.value as MetricKey]?.label}
        </span>
      ))}
    </div>
  );
}

export function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const data = buckets.map((bucket) => {
    const metrics = computeFunnelMetrics(bucket.agg);
    const point: Record<string, string | number | null> = { label: bucket.label };
    for (const key of TREND_METRIC_KEYS) {
      point[key] = metrics[key] === null ? null : Number((metrics[key]! * 100).toFixed(1));
    }
    return point;
  });

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-primary">Tendência</h2>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-ink-secondary">Sem dados no período selecionado.</p>
      ) : (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--ink-muted)" }}
                axisLine={{ stroke: "var(--gridline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--ink-muted)" }}
                unit="%"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend content={<ChartLegend />} />
              {TREND_METRIC_KEYS.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  strokeWidth={2}
                  stroke={LINE_COLORS[key]}
                  connectNulls
                  dot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-card)", fill: LINE_COLORS[key] }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface-card)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
