"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  DateRange,
  getPreviousEquivalentRange,
  getRangeForPreset,
} from "@/lib/dates";
import { PeriodPicker, PeriodSelection } from "@/components/PeriodPicker";
import { HeroSummary } from "@/components/HeroSummary";
import { FunnelChart } from "@/components/FunnelChart";
import { CostMetricCards } from "@/components/CostMetricCards";
import { AdMetricsPanel } from "@/components/AdMetricsPanel";
import { TrendChart } from "@/components/TrendChart";
import { GoalComparisonTable } from "@/components/GoalComparisonTable";
import { DailyLogTable } from "@/components/DailyLogTable";
import { MonthlyGoalCard } from "@/components/MonthlyGoalCard";
import { LeadFunnelCard } from "@/components/LeadFunnelCard";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import {
  useDashboardStatic,
  useDashboardRange,
  useDashboardDerived,
  useLeadMetrics,
} from "@/hooks/useDashboardData";
import { MetricKey } from "@/lib/types";

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

  // Range derivado da seleção do usuário
  const range = useMemo<DateRange>(
    () => getRangeForPreset(selection.presetKey, selection.customRange),
    [selection.presetKey, selection.customRange]
  );
  const previousRange = useMemo(() => getPreviousEquivalentRange(range), [range]);

  // Hooks de dados — lógica extraída do componente (UI-04)
  const { profileName, monthlyClosings, monthlyTarget } = useDashboardStatic();

  const rangeData = useDashboardRange(range, previousRange, selection.compare);

  const derived = useDashboardDerived(rangeData, range, selection.compare);

  // DASH-03: contagem de leads por status do mês atual via CRM
  const { leadCounts, loading: leadsLoading, error: leadsError } = useLeadMetrics();

  const {
    agg,
    weeklyAgg,
    metrics,
    comparison,
    goalsMap,
    missingDates,
    buckets,
    sparklineSeries,
  } = derived;

  const { loading, errorMessage } = rangeData;

  return (
    <div className="space-y-6">
      {/* Cabeçalho com saudação */}
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

      {errorMessage && (
        <p className="text-sm text-status-critical">{errorMessage}</p>
      )}

      {/* UI-01: Skeleton loading animado substituindo "Carregando..." */}
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Aviso de datas sem dados */}
          {missingDates.length > 0 && (
            <p
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-primary"
              style={{ background: "color-mix(in srgb, var(--status-warning) 16%, transparent)" }}
            >
              <AlertTriangle
                size={15}
                style={{ color: "var(--status-warning)" }}
                className="shrink-0"
              />
              Sem dados em {missingDates.length}{" "}
              {missingDates.length === 1 ? "dia" : "dias"} do período selecionado.
            </p>
          )}

          {/* Cards de resumo principais (UI-02: design melhorado via HeroSummary) */}
          <HeroSummary
            investment={weeklyAgg.investment}
            revenue={agg.revenue}
            closings={agg.closings}
            cac={metrics.cac}
            cacGoal={goalsMap.cac}
          />

          {/* Gráfico de funil (UI-03: percentuais mais legíveis) */}
          <FunnelChart agg={agg} />

          {/* Cards de custo com sparklines corrigidas (DASH-04) */}
          <CostMetricCards
            metrics={metrics as Record<MetricKey, number | null>}
            goals={goalsMap}
            comparison={comparison}
            sparklines={sparklineSeries}
          />

          {/* DASH-03: Card de leads por status (mês atual, fonte CRM) */}
          <LeadFunnelCard
            leadCounts={leadCounts}
            loading={leadsLoading}
            error={leadsError}
          />

          <AdMetricsPanel weeklyRows={rangeData.weeklyRows} />

          <TrendChart buckets={buckets} />

          <GoalComparisonTable
            metrics={metrics as Record<MetricKey, number | null>}
            goals={goalsMap}
            comparison={comparison}
          />

          <DailyLogTable range={range} entries={rangeData.entries} />

          <MonthlyGoalCard current={monthlyClosings} target={monthlyTarget} />
        </>
      )}
    </div>
  );
}
