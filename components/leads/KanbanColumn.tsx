"use client";

import { useDroppable } from "@dnd-kit/core";
import { Lead, LeadStatus, LEAD_STATUS_LABELS } from "@/lib/types";
import { LeadCard } from "./LeadCard";
import { LEAD_STATUS_COLOR_VAR } from "./leadStatusStyle";

export function KanbanColumn({
  status,
  leads,
  activeId,
  onOpenLead,
}: {
  status: LeadStatus;
  leads: Lead[];
  activeId: string | null;
  onOpenLead: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = LEAD_STATUS_COLOR_VAR[status];

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-border-hairline bg-surface-card">
      <div className="flex items-center gap-2 border-b border-border-hairline px-3 py-2.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <h3 className="text-sm font-semibold text-ink-primary">
          {LEAD_STATUS_LABELS[status]}
        </h3>
        <span className="ml-auto rounded-full bg-ink-primary/8 px-2 py-0.5 text-xs font-medium text-ink-muted">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex max-h-[70vh] min-h-[120px] flex-col gap-2 overflow-y-auto p-2.5 transition-colors ${
          isOver ? "bg-accent/5" : ""
        }`}
      >
        {leads.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-ink-muted">
            Nenhum lead aqui
          </p>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onOpen={onOpenLead}
              dragging={activeId === lead.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
