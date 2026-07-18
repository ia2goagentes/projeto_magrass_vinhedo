"use client";

import { useDroppable } from "@dnd-kit/core";
import { Lead, LeadStatus, LEAD_STATUS_LABELS } from "@/lib/types";
import { LeadCard } from "./LeadCard";
import { LEAD_STATUS_COLOR_VAR } from "./leadStatusStyle";

export function KanbanColumn({
  status,
  leads,
  activeId,
  assignedNameById,
  onOpenLead,
}: {
  status: LeadStatus;
  leads: Lead[];
  activeId: string | null;
  assignedNameById: Record<string, string>;
  onOpenLead: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = LEAD_STATUS_COLOR_VAR[status];

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border-hairline bg-surface-card">
      <div
        className="flex items-center gap-2 border-b-2 px-3 py-3"
        style={{
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
          borderBottomColor: color,
        }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        <h3 className="text-sm font-semibold" style={{ color }}>
          {LEAD_STATUS_LABELS[status]}
        </h3>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            background: `color-mix(in srgb, ${color} 20%, transparent)`,
            color,
          }}
        >
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex max-h-[70vh] min-h-[120px] flex-col gap-2 overflow-y-auto p-2.5 transition-colors"
        style={{
          background: isOver
            ? `color-mix(in srgb, ${color} 8%, transparent)`
            : `color-mix(in srgb, ${color} 3%, transparent)`,
        }}
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
              color={color}
              assignedName={lead.assigned_to ? assignedNameById[lead.assigned_to] ?? null : null}
              onOpen={onOpenLead}
              dragging={activeId === lead.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
