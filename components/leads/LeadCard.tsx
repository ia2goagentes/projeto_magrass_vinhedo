"use client";

import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, GripVertical, MessageCircle, Phone, StickyNote, User } from "lucide-react";
import { Lead } from "@/lib/types";
import { formatDateTime, formatRelativeDate, formatWhatsApp } from "./leadStatusStyle";

function initialFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function LeadCard({
  lead,
  color,
  assignedName,
  onOpen,
  dragging,
}: {
  lead: Lead;
  color: string;
  assignedName: string | null;
  onOpen: (id: string) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, borderLeftColor: color }
    : { borderLeftColor: color };

  const whatsappHref = `https://wa.me/55${lead.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`;

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
      {/* Cabeçalho: avatar + nome + grip */}
      <div className="flex items-start gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          {initialFor(lead.name)}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-primary">{lead.name}</p>
        <GripVertical
          size={14}
          className="mt-0.5 shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-60"
        />
      </div>

      {/* Origem — tag no estilo "[Facebook Ads]" */}
      {lead.origin && (
        <p className="ml-9 truncate text-[11px] font-medium text-accent">[{lead.origin}]</p>
      )}

      {/* Corpo: atendente, telefone, procedimento, agendamento */}
      <div className="mt-2 space-y-1">
        <p className="flex items-center gap-1.5 text-xs text-ink-muted">
          <User size={11} className="shrink-0" />
          <span className="truncate">{assignedName ?? "Sem atendente"}</span>
        </p>

        <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <Phone size={11} className="shrink-0" />
          <span className="truncate">{formatWhatsApp(lead.whatsapp)}</span>
        </p>

        {lead.procedure_interest && (
          <p className="truncate text-xs text-ink-muted">{lead.procedure_interest}</p>
        )}

        {lead.scheduled_at && (
          <p className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
            <CalendarClock size={11} className="shrink-0" />
            {formatDateTime(lead.scheduled_at)}
          </p>
        )}
      </div>

      {/* Rodapé: criado + nota + WhatsApp rápido */}
      <div className="mt-2.5 flex items-center justify-between border-t border-border-hairline pt-2 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          Criado {formatRelativeDate(lead.created_at)}
          {lead.notes && <StickyNote size={12} className="shrink-0" />}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label="Abrir WhatsApp"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            window.open(whatsappHref, "_blank", "noopener,noreferrer");
          }}
          className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-ink-primary/8 hover:text-accent"
        >
          <MessageCircle size={13} />
        </span>
      </div>
    </button>
  );
}
