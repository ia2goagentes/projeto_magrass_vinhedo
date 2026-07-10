import { DailyAdMetric } from "@/lib/types";

function formatDayLabel(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function AdMetricsPanel({ adRows }: { adRows: DailyAdMetric[] }) {
  const latest = [...adRows].sort((a, b) => b.metric_date.localeCompare(a.metric_date))[0];

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-primary">Mídia paga</h2>

      {!latest ? (
        <p className="mt-3 text-sm text-ink-secondary">
          Sem dados de anúncios nesse período.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-muted">Dia {formatDayLabel(latest.metric_date)} (sincronizado automaticamente)</p>

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
        </>
      )}
    </div>
  );
}
