import { CalendarCheck, Target, TrendingUp, Trophy } from "lucide-react";
import { Lead } from "@/lib/types";

// Só métricas com definição óbvia a partir do que já temos — sem inventar
// SLA de "atividades atrasadas"/"sem contato" (isso precisa ser combinado
// antes de existir, não é algo que o sistema pode chutar).
export function LeadStatsBar({ leads }: { leads: Lead[] }) {
  const opportunities = leads.filter(
    (l) => l.status !== "perdido" && l.status !== "sem_interesse"
  ).length;
  const won = leads.filter((l) => l.status === "comprou").length;
  const conversionRate = leads.length > 0 ? (won / leads.length) * 100 : null;

  // Taxa de comparecimento: dos leads que chegaram a ter um desfecho de
  // agendamento (compareceu, no-show ou comprou), quantos % de fato vieram —
  // mesma métrica que já é o coração do dashboard principal (no-show é a
  // maior dor da clínica), por isso é a mais "da nossa cara" pra trazer aqui.
  const attendanceOutcomes = leads.filter(
    (l) => l.status === "compareceu" || l.status === "no_show" || l.status === "comprou"
  );
  const attended = attendanceOutcomes.filter((l) => l.status !== "no_show").length;
  const attendanceRate =
    attendanceOutcomes.length > 0 ? (attended / attendanceOutcomes.length) * 100 : null;

  const items = [
    {
      label: "Oportunidades",
      value: String(opportunities),
      icon: Target,
      color: "var(--identity-blue)",
    },
    {
      label: "Taxa de conversão",
      value: conversionRate === null ? "—" : `${conversionRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      icon: TrendingUp,
      color: "var(--identity-teal)",
    },
    {
      label: "Taxa de comparecimento",
      value: attendanceRate === null ? "—" : `${attendanceRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      icon: CalendarCheck,
      color: "var(--identity-amber)",
    },
    {
      label: "Ganhas",
      value: String(won),
      icon: Trophy,
      color: "var(--status-good)",
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink-primary">{item.value}</p>
          </div>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}
          >
            <item.icon size={17} strokeWidth={2} />
          </span>
        </div>
      ))}
    </div>
  );
}
