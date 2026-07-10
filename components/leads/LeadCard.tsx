"use client";

import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, GripVertical, Phone, StickyNote } from "lucide-react";
import { Lead } from "@/lib/types";
import { formatDateTime, formatRelativeDate, formatWhatsApp } from "./leadStatusStyle";

export function LeadCard({
  lead,
  color,
  onOpen,
  dragging,
}: {
  lead: Lead;
  color: string;
  onOpen: (id: string) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, borderLeftColor: color }
    : { borderLeftColor: color };

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(lead.id)}
      style={style}
      className={`group w-full rounded-xl border border-border-hairline border-l-4 bg-surface-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate text-sm font-semibold text-ink-primary">{lead.name}</p>
        <GripVertical
          size={14}
          className="mt-0.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-60"
        />
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-secondary">
        <Phone size={11} className="shrink-0" />
        {formatWhatsApp(lead.whatsapp)}
      </p>

      {lead.scheduled_at && (
        <p
          className="mt-1.5 flex items-center gap-1 text-xs font-medium"
          style={{ color }}
        >
          <CalendarClock size={11} className="shrink-0" />
          {formatDateTime(lead.scheduled_at)}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-border-hairline pt-2 text-[11px] text-ink-muted">
        <span>Criado {formatRelativeDate(lead.created_at)}</span>
        {lead.notes && <StickyNote size={12} className="shrink-0" />}
      </div>
    </button>
  );
}
