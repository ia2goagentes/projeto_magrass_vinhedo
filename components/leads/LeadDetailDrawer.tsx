"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Lead, LeadStatus, LEAD_ORIGIN_OPTIONS, LEAD_STATUS_LABELS } from "@/lib/types";
import {
  formatDateTime,
  formatWhatsApp,
  humanizeFormAnswerKey,
  toDatetimeLocalValue,
} from "./leadStatusStyle";

const ALL_STATUSES = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];

export function LeadDetailDrawer({
  lead,
  onClose,
  onStatusChange,
  onNoteSaved,
  onFieldSaved,
}: {
  lead: Lead | null;
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

  const formAnswerEntries = Object.entries(lead.form_answers ?? {});

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-border-hairline bg-surface-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border-hairline px-5 py-4">
          <h2 className="text-lg font-bold text-ink-primary">{lead.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-secondary hover:bg-ink-primary/5"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
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

          <div className="mt-auto border-t border-border-hairline pt-3 text-xs text-ink-muted">
            Criado em {formatDateTime(lead.created_at)}
          </div>
        </div>
      </div>
    </>
  );
}
