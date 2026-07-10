"use client";

import { useEffect, useState } from "react";
import { addDays } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { lastCompletedMonday, mondayOf, toDateKey } from "@/lib/dates";

type FormState = {
  investment_amount: string;
  impressions_count: string;
  reach_count: string;
  reported_leads_count: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  investment_amount: "",
  impressions_count: "",
  reach_count: "",
  reported_leads_count: "",
  notes: "",
};

const FIELDS: { key: keyof FormState; label: string; step?: string }[] = [
  { key: "investment_amount", label: "Investimento em anúncios (R$)", step: "0.01" },
  { key: "impressions_count", label: "Impressões" },
  { key: "reach_count", label: "Alcance" },
  { key: "reported_leads_count", label: "Leads (painel do Meta Ads)" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent";

export default function AnunciosPage() {
  const [pickedDate, setPickedDate] = useState(toDateKey(lastCompletedMonday()));
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const weekStart = mondayOf(new Date(`${pickedDate}T00:00:00`));
  const weekStartKey = toDateKey(weekStart);
  const weekEndKey = toDateKey(addDays(weekStart, 6));

  useEffect(() => {
    let active = true;

    async function loadEntry() {
      setLoading(true);
      setSavedAt(null);
      setErrorMessage("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("weekly_ad_metrics")
        .select("*")
        .eq("week_start", weekStartKey)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
      } else if (data) {
        setForm({
          investment_amount: String(data.investment_amount),
          impressions_count: String(data.impressions_count),
          reach_count: String(data.reach_count),
          reported_leads_count: String(data.reported_leads_count),
          notes: data.notes ?? "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setLoading(false);
    }

    loadEntry();
    return () => {
      active = false;
    };
  }, [weekStartKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("weekly_ad_metrics").upsert(
      {
        week_start: weekStartKey,
        investment_amount: Number(form.investment_amount) || 0,
        impressions_count: Number(form.impressions_count) || 0,
        reach_count: Number(form.reach_count) || 0,
        reported_leads_count: Number(form.reported_leads_count) || 0,
        notes: form.notes.trim() === "" ? null : form.notes.trim(),
        filled_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "week_start" }
    );

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSavedAt(new Date().toLocaleTimeString("pt-BR"));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Anúncios (semanal)</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Lançamento semanal do tráfego pago — normalmente feito toda
        segunda-feira, com os dados da semana anterior (segunda a domingo).
      </p>

      <div className="mt-6 rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm sm:p-6">
        <div className="max-w-[220px]">
          <label className="block text-sm font-medium text-ink-secondary">
            Qualquer data da semana
          </label>
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            Semana de {weekStartKey.split("-").reverse().join("/")} a{" "}
            {weekEndKey.split("-").reverse().join("/")}
          </p>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-ink-secondary">Carregando...</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-ink-secondary">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={field.step ?? "1"}
                    value={form[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-ink-secondary">
                Observações (opcional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Algum destaque da semana: criativo que performou bem, campanha nova, etc."
                rows={3}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 sm:w-auto sm:px-6"
              style={{ background: "var(--brand-gradient)" }}
            >
              {saving ? "Salvando..." : "Salvar semana"}
            </button>

            {savedAt && (
              <p className="mt-3 flex items-center gap-1.5 text-sm" style={{ color: "var(--status-good)" }}>
                <CheckCircle2 size={15} /> Salvo às {savedAt}.
              </p>
            )}
            {errorMessage && <p className="mt-3 text-sm text-status-critical">{errorMessage}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
