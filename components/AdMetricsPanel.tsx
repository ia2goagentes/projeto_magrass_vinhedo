import { WeeklyAdMetric } from "@/lib/types";

function formatWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} a ${fmt(end)}`;
}

export function AdMetricsPanel({ weeklyRows }: { weeklyRows: WeeklyAdMetric[] }) {
  const latest = [...weeklyRows].sort((a, b) => b.week_start.localeCompare(a.week_start))[0];

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-primary">Mídia paga</h2>

      {!latest ? (
        <p className="mt-3 text-sm text-ink-secondary">
          Sem lançamento semanal de anúncios nesse período.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-muted">Semana de {formatWeekLabel(latest.week_start)}</p>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-ink-secondary">Investimento</p>
              <p className="mt-0.5 text-lg font-semibold text-ink-primary">
                {Number(latest.investment_amount).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Impressões</p>
              <p className="mt-0.5 text-lg font-semibold text-ink-primary">
                {latest.impressions_count.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Alcance</p>
              <p className="mt-0.5 text-lg font-semibold text-ink-primary">
                {latest.reach_count.toLocaleString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-secondary">Leads (Meta Ads)</p>
              <p className="mt-0.5 text-lg font-semibold text-ink-primary">
                {latest.reported_leads_count.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {latest.notes && (
            <p className="mt-4 rounded-lg bg-ink-primary/5 p-3 text-sm text-ink-secondary">
              {latest.notes}
            </p>
          )}
        </>
      )}
    </div>
  );
}
