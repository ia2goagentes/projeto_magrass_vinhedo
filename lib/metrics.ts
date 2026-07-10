import { format, startOfWeek } from "date-fns";
import { DailyAdMetric, DailyEntry, Goal, GoalDirection, MetricKey, WeeklyAdMetric } from "@/lib/types";

export type Aggregated = {
  leads: number;
  appointments: number;
  attendances: number;
  noShows: number;
  rescheduled: number;
  closings: number;
  revenue: number;
  daysWithData: number;
};

export function aggregateEntries(rows: DailyEntry[]): Aggregated {
  return rows.reduce<Aggregated>(
    (acc, row) => ({
      leads: acc.leads + row.leads_count,
      appointments: acc.appointments + row.appointments_count,
      attendances: acc.attendances + row.attendances_count,
      noShows: acc.noShows + row.no_shows_count,
      rescheduled: acc.rescheduled + row.rescheduled_count,
      closings: acc.closings + row.closings_count,
      revenue: acc.revenue + Number(row.revenue_amount),
      daysWithData: acc.daysWithData + 1,
    }),
    {
      leads: 0,
      appointments: 0,
      attendances: 0,
      noShows: 0,
      rescheduled: 0,
      closings: 0,
      revenue: 0,
      daysWithData: 0,
    }
  );
}

export type WeeklyAggregated = {
  investment: number;
  impressions: number;
  reach: number;
  reportedLeads: number;
  weeksWithData: number;
};

const EMPTY_WEEKLY: WeeklyAggregated = {
  investment: 0,
  impressions: 0,
  reach: 0,
  reportedLeads: 0,
  weeksWithData: 0,
};

export function aggregateWeeklyMetrics(rows: WeeklyAdMetric[]): WeeklyAggregated {
  return rows.reduce<WeeklyAggregated>(
    (acc, row) => ({
      investment: acc.investment + Number(row.investment_amount),
      impressions: acc.impressions + row.impressions_count,
      reach: acc.reach + row.reach_count,
      reportedLeads: acc.reportedLeads + row.reported_leads_count,
      weeksWithData: acc.weeksWithData + 1,
    }),
    { ...EMPTY_WEEKLY }
  );
}

// Mesma agregação de aggregateWeeklyMetrics, mas para as linhas diárias
// preenchidas automaticamente pelo cron da Meta (granularidade de dia, não semana).
export function aggregateDailyAdMetrics(rows: DailyAdMetric[]): WeeklyAggregated {
  return rows.reduce<WeeklyAggregated>(
    (acc, row) => ({
      investment: acc.investment + Number(row.investment_amount),
      impressions: acc.impressions + row.impressions_count,
      reach: acc.reach + row.reach_count,
      reportedLeads: acc.reportedLeads + row.reported_leads_count,
      weeksWithData: acc.weeksWithData + 1,
    }),
    { ...EMPTY_WEEKLY }
  );
}

function safeDiv(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return numerator / denominator;
}

export function computeFunnelMetrics(
  agg: Aggregated,
  weekly: WeeklyAggregated = EMPTY_WEEKLY
): Record<MetricKey, number | null> {
  // Sem nenhuma semana de anúncios lançada no período, investimento é
  // "sem dado" (mostra —), não "zero confirmado".
  const investment = weekly.weeksWithData > 0 ? weekly.investment : null;
  const investmentDiv = (numerator: number) => (investment === null ? null : safeDiv(investment, numerator));

  return {
    cpl: investmentDiv(agg.leads),
    cpa: investmentDiv(agg.appointments),
    lead_to_appointment_rate: safeDiv(agg.appointments, agg.leads),
    attendance_rate: safeDiv(agg.attendances, agg.appointments),
    no_show_rate: safeDiv(agg.noShows, agg.appointments),
    rescheduled_rate: safeDiv(agg.rescheduled, agg.appointments),
    attendance_to_closing_rate: safeDiv(agg.closings, agg.attendances),
    lead_to_closing_rate: safeDiv(agg.closings, agg.leads),
    avg_ticket: safeDiv(agg.revenue, agg.closings),
    cac: investmentDiv(agg.closings),
    roas: investment === null ? null : safeDiv(agg.revenue, investment),
  };
}

export type MetricComparison = {
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
};

export function compareMetrics(
  current: Record<MetricKey, number | null>,
  previous: Record<MetricKey, number | null>
): Record<MetricKey, MetricComparison> {
  const result = {} as Record<MetricKey, MetricComparison>;
  for (const key of Object.keys(current) as MetricKey[]) {
    const c = current[key];
    const p = previous[key];
    const deltaPct = c === null || p === null || p === 0 ? null : ((c - p) / Math.abs(p)) * 100;
    result[key] = { current: c, previous: p, deltaPct };
  }
  return result;
}

export type MetricColor = "green" | "yellow" | "red" | "neutral";

export function colorForMetric(value: number | null, goal: Goal | undefined): MetricColor {
  if (value === null || !goal || goal.target_value === null) return "neutral";
  const target = goal.target_value;
  const direction: GoalDirection = goal.direction;

  if (direction === "higher_is_better") {
    if (value >= target) return "green";
    if (value >= target * 0.9) return "yellow";
    return "red";
  }

  if (value <= target) return "green";
  if (value <= target * 1.1) return "yellow";
  return "red";
}

export type MetricFormat = "currency" | "percent" | "ratio" | "number";

export const METRIC_META: Record<MetricKey, { label: string; format: MetricFormat }> = {
  cpl: { label: "Custo por lead (CPL)", format: "currency" },
  cpa: { label: "Custo por agendamento (CPA)", format: "currency" },
  lead_to_appointment_rate: { label: "Lead → Agendamento", format: "percent" },
  attendance_rate: { label: "Taxa de comparecimento", format: "percent" },
  no_show_rate: { label: "Taxa de no-show", format: "percent" },
  rescheduled_rate: { label: "Taxa de cancelamento/remarcação", format: "percent" },
  attendance_to_closing_rate: { label: "Comparecimento → Fechamento", format: "percent" },
  lead_to_closing_rate: { label: "Lead → Fechamento (geral)", format: "percent" },
  avg_ticket: { label: "Ticket médio", format: "currency" },
  cac: { label: "CAC (custo por fechamento)", format: "currency" },
  roas: { label: "ROAS", format: "ratio" },
};

export type Bucket = { label: string; agg: Aggregated };

export function bucketEntriesByDay(rows: DailyEntry[]): Bucket[] {
  return [...rows]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((row) => ({ label: row.entry_date, agg: aggregateEntries([row]) }));
}

export function bucketEntriesByWeek(rows: DailyEntry[]): Bucket[] {
  const map = new Map<string, DailyEntry[]>();

  for (const row of rows) {
    const weekStart = startOfWeek(new Date(`${row.entry_date}T00:00:00`), { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, entries]) => ({ label, agg: aggregateEntries(entries) }));
}

export function formatMetricValue(key: MetricKey, value: number | null): string {
  if (value === null) return "—";
  const { format } = METRIC_META[key];

  if (format === "currency") {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (format === "percent") {
    return `${(value * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  }
  if (format === "ratio") {
    return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
