import { PartyPopper, Target } from "lucide-react";

export function MonthlyGoalCard({
  current,
  target,
}: {
  current: number;
  target: number | null;
}) {
  if (target === null || target <= 0) return null;

  const pct = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const reached = current >= target;

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: "color-mix(in srgb, var(--identity-blue) 14%, transparent)", color: "var(--identity-blue)" }}
        >
          <Target size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-primary">Meta do mês</p>
          <p className="text-xs text-ink-secondary">Fechamentos acumulados no mês corrente</p>
        </div>
        <p className="whitespace-nowrap text-lg font-bold tabular-nums text-ink-primary">
          {current} <span className="text-sm font-normal text-ink-muted">/ {target} novos fechamentos</span>
        </p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-primary/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--identity-blue)" }}
        />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-secondary">
        {reached ? (
          <>
            <PartyPopper size={14} /> Meta atingida!
          </>
        ) : (
          `Faltam ${remaining} fechamentos para alcançar sua meta.`
        )}
      </p>
    </div>
  );
}
