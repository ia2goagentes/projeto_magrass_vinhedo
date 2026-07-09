import { DailyEntry } from "@/lib/types";
import { DateRange, listDateKeysInRange } from "@/lib/dates";

function formatDateLabel(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

export function DailyLogTable({ range, entries }: { range: DateRange; entries: DailyEntry[] }) {
  const byDate = new Map(entries.map((e) => [e.entry_date, e]));
  const rows = listDateKeysInRange(range)
    .slice()
    .reverse()
    .map((dateKey) => ({ dateKey, entry: byDate.get(dateKey) }));

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
      <h2 className="px-5 pt-5 text-sm font-semibold text-ink-primary">
        Registro diário do período
      </h2>
      <div className="mt-3 max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-card">
            <tr className="border-b border-border-hairline text-left text-ink-muted">
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Leads</th>
              <th className="px-3 py-2 font-medium">Agend.</th>
              <th className="px-3 py-2 font-medium">Compar.</th>
              <th className="px-3 py-2 font-medium">Fecham.</th>
              <th className="px-5 py-2 font-medium">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ dateKey, entry }) => (
              <tr key={dateKey} className="border-b border-border-hairline last:border-0">
                <td className="px-5 py-2 tabular-nums text-ink-secondary">
                  {formatDateLabel(dateKey)}
                </td>
                {entry ? (
                  <>
                    <td className="px-3 py-2 tabular-nums text-ink-primary">{entry.leads_count}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-primary">
                      {entry.appointments_count}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-primary">
                      {entry.attendances_count}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-primary">{entry.closings_count}</td>
                    <td className="px-5 py-2 tabular-nums text-ink-primary">
                      {Number(entry.revenue_amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                  </>
                ) : (
                  <td colSpan={5} className="px-3 py-2 text-ink-muted">
                    Sem dados
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
