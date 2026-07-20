"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Lead,
  LeadStatus,
  LEAD_ORIGIN_OPTIONS,
  LEAD_STATUS_LABELS,
  LEAD_TRACKING_KEYS,
} from "@/lib/types";
import {
  formatRelativeDate,
  formatWhatsApp,
  humanizeFormAnswerKey,
  toDatetimeLocalValue,
  LEAD_STATUS_COLOR_VAR,
  LEAD_STATUS_ORDER,
} from "./leadStatusStyle";

const ALL_STATUSES = LEAD_STATUS_ORDER;

// Seção "Rastreamento": de onde o lead veio no anúncio (Meta Lead Ads). Só os
// campos que ajudam o atendimento a entender a origem — rótulo em português, na
// ordem campanha → conjunto → anúncio, sem IDs crus.
const TRACKING_FIELDS: {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}[] = [
  { key: "campaign_name", label: "Campanha" },
  { key: "adset_name", label: "Conjunto" },
  { key: "ad_name", label: "Anúncio" },
  {
    key: "is_organic",
    label: "Mídia",
    format: (v) =>
      v === true || v === "true" || v === 1 || v === "1" ? "Orgânico" : "Tráfego pago",
  },
];

// Chaves de rastreamento não devem se repetir em "Respostas do formulário"
// (leads antigos ainda podem tê-las gravadas lá).
const TRACKING_KEYS = new Set<string>(LEAD_TRACKING_KEYS);

function initialFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function LeadDetailDrawer({
  lead,
  assignableUsers,
  onClose,
  onStatusChange,
  onNoteSaved,
  onFieldSaved,
}: {
  lead: Lead | null;
  assignableUsers: { id: string; name: string }[];
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onNoteSaved: (id: string, notes: string) => void;
  onFieldSaved: (id: string, fields: Partial<Lead>) => void;
}) {
  const [noteValue, setNoteValue] = useState(lead?.notes ?? "");
  const [savingNote, setSavingNote] = useState(false);
  const [procedureValue, setProcedureValue] = useState(lead?.procedure_interest ?? "");
  const [tagInput, setTagInput] = useState("");

  if (!lead) return null;

  async function handleSaveNote() {
    if (!lead || noteValue === (lead.notes ?? "")) return;
    setSavingNote(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ notes: noteValue || null })
      .eq("id", lead.id);
    setSavingNote(false);
    if (!error) onNoteSaved(lead.id, noteValue);
  }

  async function handleSaveProcedure() {
    if (!lead || procedureValue === (lead.procedure_interest ?? "")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ procedure_interest: procedureValue || null })
      .eq("id", lead.id);
    if (!error) onFieldSaved(lead.id, { procedure_interest: procedureValue || null });
  }

  async function handleOriginChange(value: string) {
    if (!lead) return;
    const supabase = createClient();
    const { error } = await supabase.from("leads").update({ origin: value }).eq("id", lead.id);
    if (!error) onFieldSaved(lead.id, { origin: value });
  }

  async function handleAssignedToChange(value: string) {
    if (!lead) return;
    const assignedTo = value || null;
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: assignedTo })
      .eq("id", lead.id);
    if (!error) onFieldSaved(lead.id, { assigned_to: assignedTo });
  }

  async function handleScheduledAtChange(value: string) {
    if (!lead) return;
    const iso = value ? new Date(value).toISOString() : null;
    const supabase = createClient();
    const { error } = await supabase.from("leads").update({ scheduled_at: iso }).eq("id", lead.id);
    if (!error) onFieldSaved(lead.id, { scheduled_at: iso });
  }

  async function saveTags(nextTags: string[]) {
    if (!lead) return;
    const supabase = createClient();
    const { error } = await supabase.from("leads").update({ tags: nextTags }).eq("id", lead.id);
    if (!error) onFieldSaved(lead.id, { tags: nextTags });
  }

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const value = tagInput.trim();
    if (!value || !lead || lead.tags.includes(value)) {
      setTagInput("");
      return;
    }
    setTagInput("");
    saveTags([...lead.tags, value]);
  }

  function handleRemoveTag(tag: string) {
    if (!lead) return;
    saveTags(lead.tags.filter((t) => t !== tag));
  }

  const payload = (lead.raw_payload ?? {}) as Record<string, unknown>;
  const trackingEntries = TRACKING_FIELDS.flatMap((field) => {
    const raw = payload[field.key];
    if (raw === undefined || raw === null || raw === "") return [];
    return [{ label: field.label, value: field.format ? field.format(raw) : String(raw) }];
  });
  const formAnswerEntries = Object.entries(lead.form_answers ?? {}).filter(
    ([key]) => !TRACKING_KEYS.has(key)
  );
  const statusColor = LEAD_STATUS_COLOR_VAR[lead.status];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l border-border-hairline bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border-hairline px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold"
              style={{ background: `color-mix(in srgb, ${statusColor} 15%, transparent)`, color: statusColor }}
            >
              {initialFor(lead.name)}
            </span>
            <h2 className="text-lg font-bold text-ink-primary">{lead.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-secondary hover:bg-ink-primary/5"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                WhatsApp
              </p>
              <a
                href={`https://wa.me/55${lead.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
              >
                {formatWhatsApp(lead.whatsapp)}
              </a>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Criado
              </p>
              <p className="mt-1 text-sm font-medium text-ink-primary">
                {formatRelativeDate(lead.created_at)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Status
            </p>
            <select
              value={lead.status}
              onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
              className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Atendente
            </p>
            <select
              value={lead.assigned_to ?? ""}
              onChange={(e) => handleAssignedToChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
            >
              <option value="">Sem atendente</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink-primary">Dados do lead</h3>

            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Origem
                </p>
                <select
                  value={lead.origin ?? ""}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
                >
                  <option value="" disabled>
                    Selecione a origem
                  </option>
                  {LEAD_ORIGIN_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Procedimento de interesse
                </p>
                <input
                  type="text"
                  value={procedureValue}
                  onChange={(e) => setProcedureValue(e.target.value)}
                  onBlur={handleSaveProcedure}
                  placeholder="Ex: Emagrecimento, Botox..."
                  className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Tags
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        aria-label={`Remover tag ${tag}`}
                        className="hover:opacity-70"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Digite e pressione Enter"
                  className="mt-2 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Agendamento
            </p>
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(lead.scheduled_at)}
              onChange={(e) => handleScheduledAtChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Rastreamento
            </p>
            {trackingEntries.length === 0 ? (
              <p className="mt-1 text-sm italic text-ink-muted">
                Nenhum dado de campanha/anúncio disponível ainda para esse lead.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {trackingEntries.map((entry) => (
                  <div key={entry.label} className="flex items-center justify-between text-sm">
                    <span className="text-ink-secondary">{entry.label}</span>
                    <span className="font-medium text-ink-primary">{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Respostas do formulário
            </p>
            {formAnswerEntries.length === 0 ? (
              <p className="mt-1 text-sm italic text-ink-muted">
                Nenhuma resposta de formulário para esse lead.
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {formAnswerEntries.map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-ink-secondary">
                      {humanizeFormAnswerKey(key)}
                    </p>
                    <p className="text-sm font-medium text-ink-primary">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Nota
            </p>
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={handleSaveNote}
              rows={4}
              placeholder="Adicione uma nota sobre esse lead..."
              className="mt-1 w-full resize-none rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
            />
            {savingNote && (
              <p className="mt-1 text-xs text-ink-muted">Salvando...</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
