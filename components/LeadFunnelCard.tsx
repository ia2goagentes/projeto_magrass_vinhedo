"use client";

import { Users } from "lucide-react";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/lib/types";
import { LeadStatusCount } from "@/hooks/useDashboardData";

// Cores por status — seguindo paleta de tokens CSS existente
const STATUS_COLORS: Record<LeadStatus, string> = {
  novo: "var(--identity-blue)",
  contatado: "var(--identity-teal)",
  agendado: "var(--identity-amber)",
  compareceu: "var(--identity-green)",
  no_show: "var(--status-serious)",
  comprou: "var(--status-good)",
  perdido: "var(--status-critical)",
  sem_interesse: "var(--ink-muted)",
};

// Ordem de exibição dos status no funil
const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "contatado",
  "agendado",
  "compareceu",
  "no_show",
  "comprou",
  "perdido",
  "sem_interesse",
];

type Props = {
  leadCounts: LeadStatusCount[];
  loading: boolean;
  error: string | null;
};

export function LeadFunnelCard({ leadCounts, loading, error }: Props) {
  const total = leadCounts.reduce((sum, row) => sum + row.lead_count, 0);

  // Monta mapa de status → count para lookup O(1)
  const countMap = new Map<string, number>(
    leadCounts.map((row) => [row.status, row.lead_count])
  );

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      {/* Cabeçalho do card */}
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--identity-blue) 14%, transparent)",
            color: "var(--identity-blue)",
          }}
        >
          <Users size={17} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink-primary">Leads por Status</h2>
          <p className="text-xs text-ink-secondary">Mês atual — fonte: CRM</p>
        </div>
        {!loading && !error && (
          <p className="ml-auto text-2xl font-bold tabular-nums text-ink-primary">
            {total}
            <span className="ml-1 text-sm font-normal text-ink-muted">total</span>
          </p>
        )}
      </div>

      {/* Estado de loading: skeleton animado */}
      {loading && (
        <div className="mt-4 space-y-2" aria-label="Carregando leads por status">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-border-hairline" />
              <div className="h-3 flex-1 animate-pulse rounded bg-border-hairline" style={{ width: `${60 + i * 8}%` }} />
              <div className="h-3 w-8 animate-pulse rounded bg-border-hairline" />
            </div>
          ))}
        </div>
      )}

      {/* Erro silencioso: view pode não existir antes da Phase 1 ser deployada */}
      {!loading && error && (
        <p className="mt-4 text-xs text-ink-muted">
          Dados de leads não disponíveis ainda. ({error.slice(0, 60)})
        </p>
      )}

      {/* Conteúdo principal: barras por status */}
      {!loading && !error && (
        <div className="mt-4 space-y-2">
          {STATUS_ORDER.map((status) => {
            const count = countMap.get(status) ?? 0;
            if (count === 0) return null;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const color = STATUS_COLORS[status];

            return (
              <div key={status} className="group flex items-center gap-2.5">
                {/* Bolinha de cor */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                {/* Label */}
                <span className="min-w-[7rem] text-xs text-ink-secondary">
                  {LEAD_STATUS_LABELS[status]}
                </span>
                {/* Barra de progresso */}
                <div className="min-w-0 flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-border-hairline">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
                {/* Contagem */}
                <span className="w-6 text-right text-xs font-semibold tabular-nums text-ink-primary">
                  {count}
                </span>
              </div>
            );
          })}

          {total === 0 && (
            <p className="text-xs text-ink-muted">Nenhum lead registrado neste mês.</p>
          )}
        </div>
      )}
    </div>
  );
}
