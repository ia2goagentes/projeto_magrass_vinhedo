"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LEAD_ORIGIN_OPTIONS } from "@/lib/types";

export function AddLeadModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origin, setOrigin] = useState<string>(LEAD_ORIGIN_OPTIONS[LEAD_ORIGIN_OPTIONS.length - 1]);
  const [procedureInterest, setProcedureInterest] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim()) {
      setErrorMessage("Nome e WhatsApp são obrigatórios.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.from("leads").insert({
      name: name.trim(),
      whatsapp: whatsapp.replace(/\D/g, ""),
      origin,
      procedure_interest: procedureInterest.trim() || null,
      status: "novo",
      source: "manual",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-primary">Novo lead</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-secondary hover:bg-ink-primary/5"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-secondary">Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do lead"
                className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary">WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 91234-5678"
                className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary">Origem</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
              >
                {LEAD_ORIGIN_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-secondary">
                Procedimento de interesse
              </label>
              <input
                type="text"
                value={procedureInterest}
                onChange={(e) => setProcedureInterest(e.target.value)}
                placeholder="Ex: Emagrecimento, Botox..."
                className="mt-1 w-full rounded-lg border border-border-hairline bg-surface-page px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
              />
            </div>

            {errorMessage && <p className="text-sm text-status-critical">{errorMessage}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ background: "var(--brand-gradient)" }}
            >
              {saving ? "Salvando..." : "Adicionar lead"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
