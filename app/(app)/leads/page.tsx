"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Lead, LeadStatus, LEAD_STATUS_LABELS } from "@/lib/types";
import { LeadStatusBadge } from "@/components/LeadStatusBadge";

// ─── Tab definitions ───────────────────────────────────────────────────────────

type Tab = "todos" | LeadStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "novo", label: "Novo" },
  { key: "contatado", label: "Contatado" },
  { key: "agendado", label: "Agendado" },
  { key: "compareceu", label: "Compareceu" },
  { key: "no_show", label: "No-show" },
  { key: "comprou", label: "Comprou" },
  { key: "perdido", label: "Perdido" },
  { key: "sem_interesse", label: "Sem interesse" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatWhatsApp(digits: string): string {
  // digits: 5511912345678 → +55 (11) 91234-5678
  const d = digits.replace(/\D/g, "");
  if (d.length === 13) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  return digits;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

// ─── Note cell ─────────────────────────────────────────────────────────────────

function NoteCell({ lead, onSaved }: { lead: Lead; onSaved: (id: string, notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleFocus() {
    setEditing(true);
    setTimeout(() => textareaRef.current?.select(), 0);
  }

  async function handleSave() {
    if (value === (lead.notes ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ notes: value || null })
      .eq("id", lead.id);
    setSaving(false);
    if (!error) {
      onSaved(lead.id, value);
    }
    setEditing(false);
  }

  return (
    <div className="relative">
      {editing ? (
        <div className="flex flex-col gap-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className="w-full min-w-[200px] rounded-lg border border-border-hairline bg-surface-card px-2 py-1.5 text-xs text-ink-primary outline-none focus:border-accent resize-none"
            placeholder="Adicione uma nota..."
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setValue(lead.notes ?? "");
                setEditing(false);
              }
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleSave();
              }
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "var(--brand-gradient)" }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => {
                setValue(lead.notes ?? "");
                setEditing(false);
              }}
              className="rounded px-2 py-0.5 text-xs text-ink-secondary hover:text-ink-primary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleFocus}
          className="block w-full min-w-[160px] rounded px-2 py-1 text-left text-xs text-ink-secondary hover:bg-ink-primary/5 transition"
        >
          {value ? (
            <span className="whitespace-pre-wrap text-ink-primary">{value}</span>
          ) : (
            <span className="italic text-ink-muted">Adicionar nota...</span>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Status dropdown ───────────────────────────────────────────────────────────

const ALL_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

function StatusDropdown({
  lead,
  onChanged,
}: {
  lead: Lead;
  onChanged: (id: string, newStatus: LeadStatus) => void;
}) {
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as LeadStatus;
    // Optimistic: notify parent immediately
    onChanged(lead.id, newStatus);
    // Persist async (fire-and-forget — errors are silent for now)
    const supabase = createClient();
    await supabase.from("leads").update({ status: newStatus }).eq("id", lead.id);
  }

  return (
    <select
      value={lead.status}
      onChange={handleChange}
      className="rounded-lg border border-border-hairline bg-surface-card px-2 py-1 text-xs text-ink-primary outline-none focus:border-accent cursor-pointer"
    >
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("todos");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastCounter = useRef(0);

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
    setLoading(true);

    async function fetchLeads() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Optimistic status update ───────────────────────────────────────────────

  function handleStatusChange(id: string, newStatus: LeadStatus) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
  }

  // ── Note saved callback ────────────────────────────────────────────────────

  function handleNoteSaved(id: string, notes: string) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, notes: notes || null } : l))
    );
  }

  // ── Filter by tab ──────────────────────────────────────────────────────────

  const filteredLeads =
    activeTab === "todos" ? leads : leads.filter((l) => l.status === activeTab);

  // ── Counts per status ──────────────────────────────────────────────────────

  const counts: Record<Tab, number> = {
    todos: leads.length,
    novo: 0,
    contatado: 0,
    agendado: 0,
    compareceu: 0,
    no_show: 0,
    comprou: 0,
    perdido: 0,
    sem_interesse: 0,
  };
  leads.forEach((l) => {
    if (l.status in counts) counts[l.status]++;
  });

  return (
    <>
      <Toast items={toasts} onDismiss={dismissToast} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Leads</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Gerencie os leads do CRM — atualize status e adicione notas diretamente na lista.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-border-hairline pb-0">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs leading-none ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "bg-ink-primary/8 text-ink-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border border-border-hairline bg-surface-card p-8">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-ink-primary/5" />
              ))}
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-border-hairline bg-surface-card p-10 text-center">
            <p className="text-sm text-ink-muted">
              {leads.length === 0
                ? "Nenhum lead encontrado. Os leads aparecerão aqui quando chegarem pelo webhook."
                : `Nenhum lead com status "${TABS.find((t) => t.key === activeTab)?.label}".`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    WhatsApp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Nota
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Criado em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-ink-primary/3 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-primary">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {formatWhatsApp(lead.whatsapp)}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <LeadStatusBadge status={lead.status} />
                        <StatusDropdown lead={lead} onChanged={handleStatusChange} />
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <NoteCell lead={lead} onSaved={handleNoteSaved} />
                    </td>
                    <td className="px-4 py-3 text-ink-secondary whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-border-hairline px-4 py-2 text-xs text-ink-muted">
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
              {activeTab !== "todos" && ` com status "${TABS.find((t) => t.key === activeTab)?.label}"`}
            </div>
          </div>
        )}
      </div>

      {/* Saved indicator */}
      {!loading && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <CheckCircle2 size={12} />
          <span>Atualizações de status e notas são salvas automaticamente</span>
        </div>
      )}
    </>
  );
}
