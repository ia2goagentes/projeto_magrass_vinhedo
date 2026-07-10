"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Bell, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Lead, LeadStatus } from "@/lib/types";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import { KanbanColumn } from "@/components/leads/KanbanColumn";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { LEAD_STATUS_COLOR_VAR, LEAD_STATUS_ORDER } from "@/components/leads/leadStatusStyle";

// ─── Toast ─────────────────────────────────────────────────────────────────────

type ToastItem = { id: number; message: string };

function Toast({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="flex items-center gap-2 rounded-lg border border-border-hairline bg-surface-card px-4 py-3 text-sm text-ink-primary shadow-lg transition hover:opacity-80"
        >
          <Bell size={15} className="shrink-0 text-accent" />
          <span>{t.message}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const toastCounter = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  function addToast(message: string) {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Initial fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true;

    async function fetchLeads() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;
      setLoading(false);

      if (error) {
        console.error("Error fetching leads:", error.message);
        return;
      }

      setLeads((data as Lead[]) ?? []);
    }

    fetchLeads();
    return () => { active = false; };
  }, []);

  // ── Realtime subscription ──────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => [newLead, ...prev]);
          addToast(`Novo lead: ${newLead.name}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Status change (drag-and-drop ou seletor do painel) ─────────────────────

  async function handleStatusChange(id: string, newStatus: LeadStatus) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      addToast(`Erro ao salvar status: ${error.message}`);
    }
  }

  // ── Note saved callback ────────────────────────────────────────────────────

  function handleNoteSaved(id: string, notes: string) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes: notes || null } : l))
    );
  }

  // ── Campos genéricos (origem, procedimento, tags, agendamento) ─────────────

  function handleFieldSaved(id: string, fields: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)));
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    handleStatusChange(leadId, newStatus);
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;
  const activeLead = leads.find((l) => l.id === activeId) ?? null;

  return (
    <>
      <Toast items={toasts} onDismiss={dismissToast} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Leads</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Arraste os cards entre as colunas para atualizar o status, ou clique para ver os detalhes.
          </p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition sm:w-auto sm:shrink-0"
          style={{ background: "var(--brand-gradient)" }}
        >
          <Plus size={16} />
          Novo lead
        </button>
      </div>

      {addModalOpen && <AddLeadModal onClose={() => setAddModalOpen(false)} />}

      {loading ? (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUS_ORDER.map((status) => (
            <div
              key={status}
              className="h-64 w-72 shrink-0 animate-pulse rounded-2xl bg-ink-primary/5"
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
            {LEAD_STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={leads.filter((l) => l.status === status)}
                activeId={activeId}
                onOpenLead={setSelectedLeadId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="w-72 rotate-2">
                <LeadCard
                  lead={activeLead}
                  color={LEAD_STATUS_COLOR_VAR[activeLead.status]}
                  onOpen={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <LeadDetailDrawer
        key={selectedLead?.id ?? "closed"}
        lead={selectedLead}
        onClose={() => setSelectedLeadId(null)}
        onStatusChange={handleStatusChange}
        onNoteSaved={handleNoteSaved}
        onFieldSaved={handleFieldSaved}
      />
    </>
  );
}
