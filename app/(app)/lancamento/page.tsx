"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDateKey } from "@/lib/dates";

type FormState = {
  leads_count: string;
  appointments_count: string;
  attendances_count: string;
  no_shows_count: string;
  rescheduled_count: string;
  closings_count: string;
  revenue_amount: string;
};

const EMPTY_FORM: FormState = {
  leads_count: "",
  appointments_count: "",
  attendances_count: "",
  no_shows_count: "",
  rescheduled_count: "",
  closings_count: "",
  revenue_amount: "",
};

const FIELDS: { key: keyof FormState; label: string; step?: string }[] = [
  { key: "leads_count", label: "Leads recebidos" },
  { key: "appointments_count", label: "Agendamentos marcados" },
  { key: "attendances_count", label: "Comparecimentos" },
  { key: "no_shows_count", label: "Não comparecimentos (no-show)" },
  { key: "rescheduled_count", label: "Cancelou ou remarcou" },
  { key: "closings_count", label: "Fechamentos (vendas)" },
  { key: "revenue_amount", label: "Valor faturado (R$)", step: "0.01" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent";

export default function LancamentoPage() {
  const today = toDateKey(new Date());
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // UX-02: track whether an entry already exists for the selected date
  const [entryExists, setEntryExists] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadEntry() {
      setLoading(true);
      setSavedAt(null);
      setErrorMessage("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("entry_date", date)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
        setEntryExists(false);
      } else if (data) {
        setEntryExists(true);
        setForm({
          leads_count: String(data.leads_count),
          appointments_count: String(data.appointments_count),
          attendances_count: String(data.attendances_count),
          no_shows_count: String(data.no_shows_count),
          rescheduled_count: String(data.rescheduled_count),
          closings_count: String(data.closings_count),
          revenue_amount: String(data.revenue_amount),
        });
      } else {
        setEntryExists(false);
        setForm(EMPTY_FORM);
      }
      setLoading(false);
    }

    loadEntry();
    return () => {
      active = false;
    };
  }, [date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("daily_entries").upsert(
      {
        entry_date: date,
        leads_count: Number(form.leads_count) || 0,
        appointments_count: Number(form.appointments_count) || 0,
        attendances_count: Number(form.attendances_count) || 0,
        no_shows_count: Number(form.no_shows_count) || 0,
        rescheduled_count: Number(form.rescheduled_count) || 0,
        closings_count: Number(form.closings_count) || 0,
        revenue_amount: Number(form.revenue_amount) || 0,
        filled_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "entry_date" }
    );

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEntryExists(true);
    setSavedAt(new Date().toLocaleTimeString("pt-BR"));
  }

  // UX-02: only show the overwrite warning when the selected date is today
  // and an entry already exists (user may be editing historical dates too)
  const showOverwriteWarning = entryExists && date === today;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Lançamento diário</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Preencha os números do dia. Cada campo é independente: os comparecimentos
        de hoje podem vir de agendamentos feitos em dias anteriores, então não
        precisam bater com os agendamentos marcados hoje. Se já existir um
        lançamento para a data escolhida, os campos aparecem preenchidos e você
        pode corrigi-los.
      </p>

      <div className="mt-6 rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm sm:p-6">
        <div className="max-w-[200px]">
          <label className="block text-sm font-medium text-ink-secondary">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* UX-02: overwrite warning banner */}
        {!loading && showOverwriteWarning && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-status-warning/40 bg-status-warning/10 px-3 py-2.5 text-sm text-ink-primary">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--status-warning)" }} />
            <span>
              Já existe um lançamento para hoje. Esta ação vai{" "}
              <strong>sobrescrever</strong> os dados atuais.
            </span>
          </div>
        )}

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
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 sm:w-auto sm:px-6"
              style={{ background: "var(--brand-gradient)" }}
            >
              {saving
                ? "Salvando..."
                : entryExists
                  ? "Atualizar lançamento"
                  : "Salvar lançamento do dia"}
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
