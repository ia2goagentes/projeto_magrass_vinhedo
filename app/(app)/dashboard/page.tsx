"use client";

import { useEffect, useMemo, useState } from "react";
import { startOfMonth } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DateRange,
  getPreviousEquivalentRange,
  getRangeForPreset,
  listDateKeysInRange,
  toDateKey,
  weeklyMetricsOverlapRange,
} from "@/lib/dates";
import {
  aggregateEntries,
  aggregateWeeklyMetrics,
  bucketEntriesByDay,
  bucketEntriesByWeek,
  compareMetrics,
  computeFunnelMetrics,
} from "@/lib/metrics";
import { DailyEntry, Goal, MetricKey, WeeklyAdMetric } from "@/lib/types";
import { PeriodPicker, PeriodSelection } from "@/components/PeriodPicker";
import { HeroSummary } from "@/components/HeroSummary";
import { FunnelChart } from "@/components/FunnelChart";
import { CostMetricCards } from "@/components/CostMetricCards";
import { AdMetricsPanel } from "@/components/AdMetricsPanel";
import { TrendChart } from "@/components/TrendChart";
import { GoalComparisonTable } from "@/components/GoalComparisonTable";
import { DailyLogTable } from "@/components/DailyLogTable";
import { MonthlyGoalCard } from "@/components/MonthlyGoalCard";

const SPARKLINE_KEYS: MetricKey[] = ["cpl", "cpa", "cac", "avg_ticket", "roas"];

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const [selection, setSelection] = useState<PeriodSelection>({
    presetKey: "this_month",
    compare: false,
  });
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [previousEntries, setPreviousEntries] = useState<DailyEntry[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<WeeklyAdMetric[]>([]);
  const [previousWeeklyRows, setPreviousWeeklyRows] = useState<WeeklyAdMetric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [profileName, setProfileName] = useState("");
  const [monthlyClosings, setMonthlyClosings] = useState(0);
  const [monthlyTarget, setMonthlyTarget] = useState<number | null>(null);

  const range = useMemo<DateRange>(
    () => getRangeForPreset(selection.presetKey, selection.customRange),
    [selection.presetKey, selection.customRange]
  );
  const previousRange = useMemo(() => getPreviousEquivalentRange(range), [range]);

  useEffect(() => {
    let active = true;

    async function loadStatic() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const monthStart = toDateKey(startOfMonth(new Date()));
      const today = toDateKey(new Date());

      const [profileRes, monthEntriesRes, monthlyGoalRes] = await Promise.all([
        user
          ? supabase.from("profiles").select("name").eq("id", user.id).single()
          : Promise.resolve({ data: null }),
        supabase.from("daily_entries").select("closings_count").gte("entry_date", monthStart).lte("entry_date", today),
        supabase.from("goals").select("target_value").eq("metric_key", "monthly_closings_target").maybeSingle(),
      ]);

      if (!active) return;

      if (profileRes.data?.name) setProfileName(profileRes.data.name);
      setMonthlyClosings(
        (monthEntriesRes.data ?? []).reduce((sum, row) => sum + row.closings_count, 0)
      );
      setMonthlyTarget(monthlyGoalRes.data?.target_value ?? null);
    }

    loadStatic();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();
      const weeklyRange = weeklyMetricsOverlapRange(range);

      const entriesQuery = supabase
        .from("daily_entries")
        .select("*")
        .gte("entry_date", toDateKey(range.start))
        .lte("entry_date", toDateKey(range.end))
        .order("entry_date");

      const weeklyQuery = supabase
        .from("weekly_ad_metrics")
        .select("*")
        .gte("week_start", toDateKey(weeklyRange.start))
        .lte("week_start", toDateKey(weeklyRange.end))
        .order("week_start");

      const goalsQuery = supabase.from("goals").select("*");

      const [entriesRes, weeklyRes, goalsRes] = await Promise.all([
        entriesQuery,
        weeklyQuery,
        goalsQuery,
      ]);

      if (!active) return;

      if (entriesRes.error) setErrorMessage(entriesRes.error.message);
      else setEntries(entriesRes.data ?? []);

      if (weeklyRes.error) setErrorMessage(weeklyRes.error.message);
      else setWeeklyRows(weeklyRes.data ?? []);

      if (goalsRes.error) setErrorMessage(goalsRes.error.message);
      else setGoals(goalsRes.data ?? []);

      if (selection.compare) {
        const previousWeeklyRange = weeklyMetricsOverlapRange(previousRange);

        const [prevEntriesRes, prevWeeklyRes] = await Promise.all([
          supabase
            .from("daily_entries")
            .select("*")
            .gte("entry_date", toDateKey(previousRange.start))
            .lte("entry_date", toDateKey(previousRange.end))
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
    return () => {
      active = false;
    };
  }, [range, previousRange, selection.compare]);

  const agg = useMemo(() => aggregateEntries(entries), [entries]);
  const weeklyAgg = useMemo(() => aggregateWeeklyMetrics(weeklyRows), [weeklyRows]);
  const metrics = useMemo(() => computeFunnelMetrics(agg, weeklyAgg), [agg, weeklyAgg]);

  const previousAgg = useMemo(() => aggregateEntries(previousEntries), [previousEntries]);
  const previousWeeklyAgg = useMemo(
    () => aggregateWeeklyMetrics(previousWeeklyRows),
    [previousWeeklyRows]
  );
  const previousMetrics = useMemo(
    () => computeFunnelMetrics(previousAgg, previousWeeklyAgg),
    [previousAgg, previousWeeklyAgg]
  );

  const comparison = selection.compare ? compareMetrics(metrics, previousMetrics) : undefined;

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

  const sparklineSeries = useMemo(() => {
    const series: Partial<Record<MetricKey, number[]>> = {};
    for (const key of SPARKLINE_KEYS) series[key] = [];
    for (const bucket of buckets) {
      const bucketMetrics = computeFunnelMetrics(bucket.agg, weeklyAgg);
      for (const key of SPARKLINE_KEYS) {
        const value = bucketMetrics[key];
        if (value !== null) series[key]!.push(value);
      }
    }
    return series;
  }, [buckets, weeklyAgg]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
            {greetingForNow()}{profileName ? `, ${profileName.split(" ")[0]}` : ""}! 👋
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Aqui está o desempenho da clínica no período selecionado.
          </p>
        </div>
      </div>

      <PeriodPicker value={selection} onChange={setSelection} />

      {errorMessage && <p className="text-sm text-status-critical">{errorMessage}</p>}

      {loading ? (
        <p className="text-sm text-ink-secondary">Carregando...</p>
      ) : (
        <>
          {missingDates.length > 0 && (
            <p
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-primary"
              style={{ background: "color-mix(in srgb, var(--status-warning) 16%, transparent)" }}
            >
              <AlertTriangle size={15} style={{ color: "var(--status-warning)" }} className="shrink-0" />
              Sem dados em {missingDates.length}{" "}
              {missingDates.length === 1 ? "dia" : "dias"} do período selecionado.
            </p>
          )}

          <HeroSummary
            investment={weeklyAgg.investment}
            revenue={agg.revenue}
            closings={agg.closings}
            cac={metrics.cac}
            cacGoal={goalsMap.cac}
          />

          <FunnelChart agg={agg} />

          <CostMetricCards
            metrics={metrics as Record<MetricKey, number | null>}
            goals={goalsMap}
            comparison={comparison}
            sparklines={sparklineSeries}
          />

          <AdMetricsPanel weeklyRows={weeklyRows} />

          <TrendChart buckets={buckets} />

          <GoalComparisonTable
            metrics={metrics as Record<MetricKey, number | null>}
            goals={goalsMap}
            comparison={comparison}
          />

          <DailyLogTable range={range} entries={entries} />

          <MonthlyGoalCard current={monthlyClosings} target={monthlyTarget} />
        </>
      )}
    </div>
  );
}
