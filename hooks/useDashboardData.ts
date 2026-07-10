"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import {
  DateRange,
  listDateKeysInRange,
  toDateKey,
  weeklyMetricsOverlapRange,
} from "@/lib/dates";
import {
  Aggregated,
  Bucket,
  MetricComparison,
  aggregateEntries,
  aggregateWeeklyMetrics,
  bucketEntriesByDay,
  bucketEntriesByWeek,
  compareMetrics,
  computeFunnelMetrics,
  WeeklyAggregated,
} from "@/lib/metrics";
import { DailyEntry, Goal, MetricKey, WeeklyAdMetric } from "@/lib/types";

// Métricas que têm sparkline nos cards de custo
const SPARKLINE_KEYS: MetricKey[] = ["cpl", "cpa", "cac", "avg_ticket", "roas"];

export type DashboardStaticData = {
  profileName: string;
  monthlyClosings: number;
  monthlyTarget: number | null;
};

export type DashboardRangeData = {
  entries: DailyEntry[];
  previousEntries: DailyEntry[];
  weeklyRows: WeeklyAdMetric[];
  previousWeeklyRows: WeeklyAdMetric[];
  goals: Goal[];
  loading: boolean;
  errorMessage: string;
};

export type DashboardDerived = {
  agg: Aggregated;
  weeklyAgg: WeeklyAggregated;
  metrics: Record<MetricKey, number | null>;
  previousAgg: Aggregated;
  previousWeeklyAgg: WeeklyAggregated;
  previousMetrics: Record<MetricKey, number | null>;
  comparison: Record<MetricKey, MetricComparison> | undefined;
  goalsMap: Record<string, Goal>;
  missingDates: string[];
  daySpan: number;
  buckets: Bucket[];
  sparklineSeries: Partial<Record<MetricKey, number[]>>;
};

// Hook estático: carrega dados que não dependem do range de datas
export function useDashboardStatic(): DashboardStaticData {
  const [profileName, setProfileName] = useState("");
  const [monthlyClosings, setMonthlyClosings] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const monthStart = toDateKey(startOfMonth(new Date()));
      const today = toDateKey(new Date());

      const [profileRes, monthEntriesRes, monthlyGoalRes] = await Promise.all([
        user
          ? supabase.from("profiles").select("name").eq("id", user.id).single()
          : Promise.resolve({ data: null }),
        supabase
          .from("daily_entries")
          .select("closings_count")
          .gte("entry_date", monthStart)
          .lte("entry_date", today),
        supabase
          .from("goals")
          .select("target_value")
          .eq("metric_key", "monthly_closings_target")
          .maybeSingle(),
      ]);

      if (!active) return;

      if (profileRes.data?.name) setProfileName(profileRes.data.name);
      setMonthlyClosings(
        (monthEntriesRes.data ?? []).reduce((sum, row) => sum + row.closings_count, 0)
      );
      setMonthlyTarget(monthlyGoalRes.data?.target_value ?? null);
    }

    load();
    return () => { active = false; };
  }, []);

  return { profileName, monthlyClosings, monthlyTarget };
}

// Hook de range: carrega entradas e métricas para o período selecionado
export function useDashboardRange(
  range: DateRange,
  previousRange: DateRange,
  withComparison: boolean
): DashboardRangeData {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [previousEntries, setPreviousEntries] = useState<DailyEntry[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyAdMetric[]>([]);
  const [previousWeeklyRows, setPreviousWeeklyRows] = useState<WeeklyAdMetric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Guarda referência estável do previousRange para não re-disparar efeito desnecessariamente
  const prevRangeRef = useRef(previousRange);
  useEffect(() => {
    prevRangeRef.current = previousRange;
  }, [previousRange]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();
      const weeklyRange = weeklyMetricsOverlapRange(range);

      const [entriesRes, weeklyRes, goalsRes] = await Promise.all([
        supabase
          .from("daily_entries")
          .select("*")
          .gte("entry_date", toDateKey(range.start))
          .lte("entry_date", toDateKey(range.end))
          .order("entry_date"),
        supabase
          .from("weekly_ad_metrics")
          .select("*")
          .gte("week_start", toDateKey(weeklyRange.start))
          .lte("week_start", toDateKey(weeklyRange.end))
          .order("week_start"),
        supabase.from("goals").select("*"),
      ]);

      if (!active) return;

      if (entriesRes.error) setErrorMessage(entriesRes.error.message);
      else setEntries(entriesRes.data ?? []);

      if (weeklyRes.error) setErrorMessage(weeklyRes.error.message);
      else setWeeklyRows(weeklyRes.data ?? []);

      if (goalsRes.error) setErrorMessage(goalsRes.error.message);
      else setGoals(goalsRes.data ?? []);

      if (withComparison) {
        const pRange = prevRangeRef.current;
        const previousWeeklyRange = weeklyMetricsOverlapRange(pRange);

        const [prevEntriesRes, prevWeeklyRes] = await Promise.all([
          supabase
            .from("daily_entries")
            .select("*")
            .gte("entry_date", toDateKey(pRange.start))
            .lte("entry_date", toDateKey(pRange.end))
            .order("entry_date"),
          supabase
            .from("weekly_ad_metrics")
            .select("*")
            .gte("week_start", toDateKey(previousWeeklyRange.start))
            .lte("week_start", toDateKey(previousWeeklyRange.end))
            .order("week_start"),
        ]);

        if (!active) return;

        if (prevEntriesRes.error) setErrorMessage(prevEntriesRes.error.message);
        else setPreviousEntries(prevEntriesRes.data ?? []);

        if (prevWeeklyRes.error) setErrorMessage(prevWeeklyRes.error.message);
        else setPreviousWeeklyRows(prevWeeklyRes.data ?? []);
      } else {
        setPreviousEntries([]);
        setPreviousWeeklyRows([]);
      }

      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [range, withComparison]);

  return {
    entries,
    previousEntries,
    weeklyRows,
    previousWeeklyRows,
    goals,
    loading,
    errorMessage,
  };
}

// Hook derivado: calcula métricas a partir dos dados brutos (sem IO)
export function useDashboardDerived(
  data: DashboardRangeData,
  range: DateRange,
  withComparison: boolean
): DashboardDerived {
  const { entries, previousEntries, weeklyRows, previousWeeklyRows, goals } = data;

  const agg = useMemo(() => aggregateEntries(entries), [entries]);
  const weeklyAgg = useMemo(() => aggregateWeeklyMetrics(weeklyRows), [weeklyRows]);
  const metrics = useMemo(() => computeFunnelMetrics(agg, weeklyAgg), [agg, weeklyAgg]);

  const previousAgg = useMemo(() => aggregateEntries(previousEntries), [previousEntries]);
  const previousWeeklyAgg = useMemo(() => aggregateWeeklyMetrics(previousWeeklyRows), [previousWeeklyRows]);
  const previousMetrics = useMemo(
    () => computeFunnelMetrics(previousAgg, previousWeeklyAgg),
    [previousAgg, previousWeeklyAgg]
  );

  const comparison = useMemo(
    () => (withComparison ? compareMetrics(metrics, previousMetrics) : undefined),
    [withComparison, metrics, previousMetrics]
  );

  const goalsMap = useMemo(() => {
    const map: Record<string, Goal> = {};
    for (const goal of goals) map[goal.metric_key] = goal;
    return map;
  }, [goals]);

  const missingDates = useMemo(() => {
    const present = new Set(entries.map((e) => e.entry_date));
    return listDateKeysInRange(range).filter((d) => !present.has(d));
  }, [entries, range]);

  const daySpan = listDateKeysInRange(range).length;

  const buckets = useMemo(
    () => (daySpan > 21 ? bucketEntriesByWeek(entries) : bucketEntriesByDay(entries)),
    [entries, daySpan]
  );

  // DASH-04: corrige sparklines usando weekly data por bucket em vez do agregado global
  // O bug anterior passava weeklyAgg (total do período inteiro) para cada bucket,
  // fazendo CPL/CPA/CAC/ROAS sempre iguais → linha reta.
  // Agora: cada bucket tem seu próprio sub-range de weeklyRows para o cálculo.
  const sparklineSeries = useMemo(() => {
    const series: Partial<Record<MetricKey, number[]>> = {};
    for (const key of SPARKLINE_KEYS) series[key] = [];

    for (const bucket of buckets) {
      // Para métricas que dependem só de daily_entries (avg_ticket, etc),
      // usamos o weeklyAgg completo. Para CPL/CPA/CAC/ROAS que dependem de investment,
      // encontramos as semanas que se sobrepõem ao bucket.
      const bucketStart = bucket.label; // "yyyy-MM-dd"
      const bucketWeekly = weeklyRows.filter((w) => {
        // Inclui a semana se a data de início da semana é próxima ao bucket
        // (semana de 7 dias que engloba ou precede o bucket)
        return w.week_start <= bucketStart &&
          toDateKey(new Date(new Date(w.week_start).getTime() + 6 * 24 * 60 * 60 * 1000)) >= bucketStart;
      });

      const bucketWeeklyAgg = bucketWeekly.length > 0
        ? aggregateWeeklyMetrics(bucketWeekly)
        : // Fallback: distribui o investimento proporcional ao número de buckets
          {
            investment: weeklyAgg.investment / Math.max(1, buckets.length),
            impressions: 0,
            reach: 0,
            reportedLeads: weeklyAgg.reportedLeads / Math.max(1, buckets.length),
            weeksWithData: weeklyAgg.weeksWithData > 0 ? 1 : 0,
          };

      const bucketMetrics = computeFunnelMetrics(bucket.agg, bucketWeeklyAgg);

      for (const key of SPARKLINE_KEYS) {
        const value = bucketMetrics[key];
        if (value !== null) series[key]!.push(value);
      }
    }
    return series;
  }, [buckets, weeklyRows, weeklyAgg]);

  return {
    agg,
    weeklyAgg,
    metrics,
    previousAgg,
    previousWeeklyAgg,
    previousMetrics,
    comparison,
    goalsMap,
    missingDates,
    daySpan,
    buckets,
    sparklineSeries,
  };
}

// Hook de leads do CRM: busca contagem de leads por status do mês atual
// Requer a view lead_funnel_by_status no Supabase (Phase 1 schema)
export type LeadStatusCount = {
  status: string;
  lead_count: number;
};

export function useLeadMetrics() {
  const [leadCounts, setLeadCounts] = useState<LeadStatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const { data, error: queryError } = await supabase
        .from("lead_funnel_by_status")
        .select("status, lead_count");

      if (!active) return;

      if (queryError) {
        // View pode não existir ainda (Phase 1 não deployada) — falha silenciosa
        setError(queryError.message);
        setLeadCounts([]);
      } else {
        setLeadCounts(data ?? []);
        setError(null);
      }
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  return { leadCounts, loading, error };
}
