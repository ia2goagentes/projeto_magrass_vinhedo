"use client";

import { useEffect, useState } from "react";
import { startOfMonth, subDays } from "date-fns";
import { CheckCircle2, CloudDownload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toDateKey } from "@/lib/dates";

type FormState = {
  investment_amount: string;
  impressions_count: string;
  reach_count: string;
  reported_leads_count: string;
};

const EMPTY_FORM: FormState = {
  investment_amount: "",
  impressions_count: "",
  reach_count: "",
  reported_leads_count: "",
};

const FIELDS: { key: keyof FormState; label: string; step?: string }[] = [
  { key: "investment_amount", label: "Investimento em anúncios (R$)", step: "0.01" },
  { key: "impressions_count", label: "Impressões" },
  { key: "reach_count", label: "Alcance" },
  { key: "reported_leads_count", label: "Leads (painel do Meta Ads)" },
];

const inputClass =
  "mt-1 w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent";

type ImportedDay = {
  date: string;
  investment: number;
  impressions: number;
  reach: number;
  reportedLeads: number;
};

function formatDate(dateKey: string): string {
  return dateKey.split("-").reverse().join("/");
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");

// ─── Sincronização com a Meta ──────────────────────────────────────────────────

function MetaSyncCard({ onImported }: { onImported: () => void }) {
  const yesterday = subDays(new Date(), 1);
  const [since, setSince] = useState(toDateKey(startOfMonth(new Date())));
  const [until, setUntil] = useState(toDateKey(yesterday));
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [imported, setImported] = useState<ImportedDay[] | null>(null);

  async function handleSync() {
    setSyncing(true);
    setErrorMessage("");
    setImported(null);

    try {
      const res = await fetch("/api/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ since, until }),
      });
      const body = await res.json();

      if (!res.ok) {
        setErrorMessage(body.error ?? "Falha ao sincronizar.");
        return;
      }

      setImported(body.days as ImportedDay[]);
      onImported();
    } catch {
      setErrorMessage("Não foi possível falar com o servidor. Tente de novo.");
    } finally {
      setSyncing(false);
    }
  }

  const total = imported?.reduce(
    (acc, d) => ({
      investment: acc.investment + d.investment,
      impressions: acc.impressions + d.impressions,
      reach: acc.reach + d.reach,
      reportedLeads: acc.reportedLeads + d.reportedLeads,
    }),
    { investment: 0, impressions: 0, reach: 0, reportedLeads: 0 }
  );

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-ink-primary">Buscar da Meta</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Escolha o período e o sistema traz investimento, impressões, alcance e
        leads direto da conta de anúncios — dia a dia. Use para preencher
        períodos anteriores à sincronização automática.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-medium text-ink-secondary">Data de início</label>
          <input
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-secondary">Data de fim</label>
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          <CloudDownload size={16} />
          {syncing ? "Buscando..." : "Buscar da Meta"}
        </button>
      </div>

      {errorMessage && <p className="mt-3 text-sm text-status-critical">{errorMessage}</p>}

      {imported && imported.length === 0 && (
        <p className="mt-4 text-sm text-ink-secondary">
          A Meta não retornou veiculação nesse período — provavelmente não havia
          campanha ativa. Nada foi gravado.
        </p>
      )}

      {imported && imported.length > 0 && total && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--status-good)" }}>
            <CheckCircle2 size={15} />
            {imported.length} {imported.length === 1 ? "dia importado" : "dias importados"}.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2 pr-4 font-medium">Dia</th>
                  <th className="py-2 pr-4 font-medium">Investimento</th>
                  <th className="py-2 pr-4 font-medium">Impressões</th>
                  <th className="py-2 pr-4 font-medium">Alcance</th>
                  <th className="py-2 font-medium">Leads</th>
                </tr>
              </thead>
              <tbody>
                {imported.map((day) => (
                  <tr key={day.date} className="border-b border-border-hairline/60">
                    <td className="py-2 pr-4 text-ink-primary">{formatDate(day.date)}</td>
                    <td className="py-2 pr-4 tabular-nums text-ink-secondary">
                      {money.format(day.investment)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-ink-secondary">
                      {integer.format(day.impressions)}
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-ink-secondary">
                      {integer.format(day.reach)}
                    </td>
                    <td className="py-2 tabular-nums text-ink-secondary">
                      {integer.format(day.reportedLeads)}
                    </td>
                  </tr>
                ))}
                <tr className="font-medium text-ink-primary">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 tabular-nums">{money.format(total.investment)}</td>
                  <td className="py-2 pr-4 tabular-nums">{integer.format(total.impressions)}</td>
                  <td className="py-2 pr-4 tabular-nums">{integer.format(total.reach)}</td>
                  <td className="py-2 tabular-nums">{integer.format(total.reportedLeads)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ajuste manual de um dia ───────────────────────────────────────────────────

function ManualDayCard({ reloadKey }: { reloadKey: number }) {
  const [date, setDate] = useState(toDateKey(subDays(new Date(), 1)));
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDay() {
      setLoading(true);
      setSavedAt(null);
      setErrorMessage("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_ad_metrics")
        .select("*")
        .eq("metric_date", date)
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
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setLoading(false);
    }

    loadDay();
    return () => {
      active = false;
    };
  }, [date, reloadKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/ads/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric_date: date, ...form }),
      });
      const body = await res.json();

      if (!res.ok) {
        setErrorMessage(body.error ?? "Falha ao salvar.");
        return;
      }

      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    } catch {
      setErrorMessage("Não foi possível falar com o servidor. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-ink-primary">Ajuste manual</h2>
      <p className="mt-1 text-sm text-ink-secondary">
        Corrija os números de um dia específico na mão. Só é necessário se a Meta
        estiver indisponível ou se algum valor vier errado.
      </p>

      <div className="mt-4 max-w-[200px]">
        <label className="block text-sm font-medium text-ink-secondary">Dia</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
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

          <button
            type="submit"
            disabled={saving}
            className="mt-6 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 sm:w-auto sm:px-6"
            style={{ background: "var(--brand-gradient)" }}
          >
            {saving ? "Salvando..." : "Salvar dia"}
          </button>

          {savedAt && (
            <p
              className="mt-3 flex items-center gap-1.5 text-sm"
              style={{ color: "var(--status-good)" }}
            >
              <CheckCircle2 size={15} /> Salvo às {savedAt}.
            </p>
          )}
          {errorMessage && <p className="mt-3 text-sm text-status-critical">{errorMessage}</p>}
        </form>
      )}
    </div>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function AnunciosPage() {
  // Um import da Meta muda o que o ajuste manual deve exibir — este contador
  // força o recarregamento do dia selecionado lá embaixo.
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Anúncios</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Os números do tráfego pago são sincronizados sozinhos com a Meta todo dia
        de manhã. Aqui você preenche períodos passados e corrige o que precisar.
      </p>

      <div className="mt-6">
        <MetaSyncCard onImported={() => setReloadKey((k) => k + 1)} />
        <ManualDayCard reloadKey={reloadKey} />
      </div>
    </div>
  );
}
