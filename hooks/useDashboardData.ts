"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { DateRange, listDateKeysInRange, toDateKey } from "@/lib/dates";
import {
  Aggregated,
  Bucket,
  MetricComparison,
  aggregateDailyAdMetrics,
  aggregateEntries,
  bucketEntriesByDay,
  bucketEntriesByWeek,
  compareMetrics,
  computeFunnelMetrics,
  WeeklyAggregated,
} from "@/lib/metrics";
import { DailyAdMetric, DailyEntry, Goal, MetricKey } from "@/lib/types";

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
  adRows: DailyAdMetric[];
  previousAdRows: DailyAdMetric[];
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
  const [adRows, setAdRows] = useState<DailyAdMetric[]>([]);
  const [previousAdRows, setPreviousAdRows] = useState<DailyAdMetric[]>([]);
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

      const [entriesRes, adRes, goalsRes] = await Promise.all([
        supabase
          .from("daily_entries")
          .select("*")
          .gte("entry_date", toDateKey(range.start))
          .lte("entry_date", toDateKey(range.end))
          .order("entry_date"),
        supabase
          .from("daily_ad_metrics")
          .select("*")
          .gte("metric_date", toDateKey(range.start))
          .lte("metric_date", toDateKey(range.end))
          .order("metric_date"),
        supabase.from("goals").select("*"),
      ]);

      if (!active) return;

      if (entriesRes.error) setErrorMessage(entriesRes.error.message);
      else setEntries(entriesRes.data ?? []);

      if (adRes.error) setErrorMessage(adRes.error.message);
      else setAdRows(adRes.data ?? []);

      if (goalsRes.error) setErrorMessage(goalsRes.error.message);
      else setGoals(goalsRes.data ?? []);

      if (withComparison) {
        const pRange = prevRangeRef.current;

        const [prevEntriesRes, prevAdRes] = await Promise.all([
          supabase
            .from("daily_entries")
            .select("*")
            .gte("entry_date", toDateKey(pRange.start))
            .lte("entry_date", toDateKey(pRange.end))
            .order("entry_date"),
          supabase
            .from("daily_ad_metrics")
            .select("*")
            .gte("metric_date", toDateKey(pRange.start))
            .lte("metric_date", toDateKey(pRange.end))
            .order("metric_date"),
        ]);

        if (!active) return;

        if (prevEntriesRes.error) setErrorMessage(prevEntriesRes.error.message);
        else setPreviousEntries(prevEntriesRes.data ?? []);

        if (prevAdRes.error) setErrorMessage(prevAdRes.error.message);
        else setPreviousAdRows(prevAdRes.data ?? []);
      } else {
        setPreviousEntries([]);
        setPreviousAdRows([]);
      }

      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, [range, withComparison]);

  return {
    entries,
    previousEntries,
    adRows,
    previousAdRows,
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
  const { entries, previousEntries, adRows, previousAdRows, goals } = data;

  const agg = useMemo(() => aggregateEntries(entries), [entries]);
  const weeklyAgg = useMemo(() => aggregateDailyAdMetrics(adRows), [adRows]);
  const metrics = useMemo(() => computeFunnelMetrics(agg, weeklyAgg), [agg, weeklyAgg]);

  const previousAgg = useMemo(() => aggregateEntries(previousEntries), [previousEntries]);
  const previousWeeklyAgg = useMemo(() => aggregateDailyAdMetrics(previousAdRows), [previousAdRows]);
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

  // Sparklines: cada bucket (dia ou semana) tem seu próprio sub-conjunto de
  // adRows filtrado pela data — granularidade diária torna isso exato, sem
  // precisar mais estimar/distribuir investimento como na versão semanal.
  const sparklineSeries = useMemo(() => {
    const series: Partial<Record<MetricKey, number[]>> = {};
    for (const key of SPARKLINE_KEYS) series[key] = [];

    for (const bucket of buckets) {
      const bucketStart = bucket.label; // "yyyy-MM-dd"
      const bucketEnd =
        daySpan > 21 ? toDateKey(new Date(new Date(`${bucketStart}T00:00:00`).getTime() + 6 * 24 * 60 * 60 * 1000)) : bucketStart;

      const bucketAdRows = adRows.filter(
        (r) => r.metric_date >= bucketStart && r.metric_date <= bucketEnd
      );
      const bucketAdAgg = aggregateDailyAdMetrics(bucketAdRows);
      const bucketMetrics = computeFunnelMetrics(bucket.agg, bucketAdAgg);

      for (const key of SPARKLINE_KEYS) {
        const value = bucketMetrics[key];
        if (value !== null) series[key]!.push(value);
      }
    }
    return series;
  }, [buckets, adRows, daySpan]);

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
