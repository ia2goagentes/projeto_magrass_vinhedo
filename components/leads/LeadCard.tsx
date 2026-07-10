"use client";

import { useDraggable } from "@dnd-kit/core";
import { StickyNote } from "lucide-react";
import { Lead } from "@/lib/types";
import { formatDate, formatWhatsApp } from "./leadStatusStyle";

export function LeadCard({
  lead,
  onOpen,
  dragging,
}: {
  lead: Lead;
  onOpen: (id: string) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(lead.id)}
      style={style}
      className={`w-full rounded-xl border border-border-hairline bg-surface-page p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <p className="truncate text-sm font-semibold text-ink-primary">{lead.name}</p>
      <p className="mt-0.5 text-xs text-ink-secondary">{formatWhatsApp(lead.whatsapp)}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted">
        <span>{formatDate(lead.created_at)}</span>
        {lead.notes && <StickyNote size={12} className="shrink-0" />}
      </div>
    </button>
  );
}
