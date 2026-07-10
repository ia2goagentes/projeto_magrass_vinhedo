"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DailyAdMetric, DailyEntry, WeeklyAdMetric } from "@/lib/types";

const PAGE_SIZE = 30;

function formatDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

function formatWeekLabel(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${fmt(start)} a ${fmt(end)}`;
}

function currency(value: number) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function HistoricoPage() {
  const [tab, setTab] = useState<"diario" | "anuncios" | "semanal">("diario");

  const TABS: { key: typeof tab; label: string }[] = [
    { key: "diario", label: "Lançamentos diários" },
    { key: "anuncios", label: "Anúncios (Meta, automático)" },
    { key: "semanal", label: "Anúncios (manual, reserva)" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Histórico</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Todos os lançamentos já registrados, do mais recente pro mais antigo.
      </p>

      <div className="mt-6 flex w-fit flex-wrap gap-1 rounded-2xl border border-border-hairline bg-surface-card p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-accent text-white" : "text-ink-secondary hover:bg-ink-primary/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "diario" ? <DailyHistory /> : tab === "anuncios" ? <DailyAdHistory /> : <WeeklyHistory />}
      </div>
    </div>
  );
}

function DailyHistory() {
  const [rows, setRows] = useState<DailyEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPage(nextPage: number) {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("daily_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .range(from, to);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const newRows = data ?? [];
    setRows((prev) => (nextPage === 0 ? newRows : [...prev, ...newRows]));
    setHasMore(newRows.length === PAGE_SIZE);
    setPage(nextPage);
    setLoading(false);
  }

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_entries")
        .select("*")
        .order("entry_date", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const newRows = data ?? [];
      setRows(newRows);
      setHasMore(newRows.length === PAGE_SIZE);
      setPage(0);
      setLoading(false);
    }
    run();
  }, []);

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
      {errorMessage && <p className="p-4 text-sm text-status-critical">{errorMessage}</p>}

      <div className="divide-y divide-border-hairline sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="p-4">
            <p className="text-sm font-medium text-ink-primary">{formatDate(row.entry_date)}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-ink-secondary">
              <span>Leads {row.leads_count}</span>
              <span>Agend. {row.appointments_count}</span>
              <span>Compar. {row.attendances_count}</span>
              <span>Fecham. {row.closings_count}</span>
              <span>{currency(row.revenue_amount)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-ink-muted">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Leads</th>
              <th className="px-3 py-3 font-medium">Agend.</th>
              <th className="px-3 py-3 font-medium">Compar.</th>
              <th className="px-3 py-3 font-medium">No-show</th>
              <th className="px-3 py-3 font-medium">Remarcou</th>
              <th className="px-3 py-3 font-medium">Fecham.</th>
              <th className="px-5 py-3 font-medium">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border-hairline last:border-0">
                <td className="px-5 py-2.5 tabular-nums text-ink-secondary">
                  {formatDate(row.entry_date)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">{row.leads_count}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">{row.appointments_count}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">{row.attendances_count}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">{row.no_shows_count}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">{row.rescheduled_count}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">{row.closings_count}</td>
                <td className="px-5 py-2.5 tabular-nums text-ink-primary">
                  {currency(row.revenue_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && (
        <p className="p-4 text-sm text-ink-secondary">Nenhum lançamento ainda.</p>
      )}

      <PaginationFooter
        loading={loading}
        hasMore={hasMore}
        hasRows={rows.length > 0}
        onLoadMore={() => loadPage(page + 1)}
      />
    </div>
  );
}

function DailyAdHistory() {
  const [rows, setRows] = useState<DailyAdMetric[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPage(nextPage: number) {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("daily_ad_metrics")
      .select("*")
      .order("metric_date", { ascending: false })
      .range(from, to);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const newRows = data ?? [];
    setRows((prev) => (nextPage === 0 ? newRows : [...prev, ...newRows]));
    setHasMore(newRows.length === PAGE_SIZE);
    setPage(nextPage);
    setLoading(false);
  }

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_ad_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const newRows = data ?? [];
      setRows(newRows);
      setHasMore(newRows.length === PAGE_SIZE);
      setPage(0);
      setLoading(false);
    }
    run();
  }, []);

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
      <p className="px-5 pt-4 text-xs text-ink-muted">
        Preenchido automaticamente todo dia às 9h com os dados do dia anterior, direto da Meta.
      </p>

      {errorMessage && <p className="p-4 text-sm text-status-critical">{errorMessage}</p>}

      <div className="mt-2 divide-y divide-border-hairline sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="p-4">
            <p className="text-sm font-medium text-ink-primary">{formatDate(row.metric_date)}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-ink-secondary">
              <span>{currency(row.investment_amount)}</span>
              <span>{row.impressions_count.toLocaleString("pt-BR")} impr.</span>
              <span>{row.reach_count.toLocaleString("pt-BR")} alcance</span>
              <span>{row.reported_leads_count} leads</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-ink-muted">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-3 py-3 font-medium">Investimento</th>
              <th className="px-3 py-3 font-medium">Impressões</th>
              <th className="px-3 py-3 font-medium">Alcance</th>
              <th className="px-5 py-3 font-medium">Leads (Meta)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border-hairline last:border-0">
                <td className="px-5 py-2.5 tabular-nums text-ink-secondary">
                  {formatDate(row.metric_date)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {currency(row.investment_amount)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {row.impressions_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {row.reach_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-5 py-2.5 tabular-nums text-ink-primary">
                  {row.reported_leads_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && (
        <p className="p-4 text-sm text-ink-secondary">Nenhuma sincronização ainda.</p>
      )}

      <PaginationFooter
        loading={loading}
        hasMore={hasMore}
        hasRows={rows.length > 0}
        onLoadMore={() => loadPage(page + 1)}
      />
    </div>
  );
}

function WeeklyHistory() {
  const [rows, setRows] = useState<WeeklyAdMetric[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPage(nextPage: number) {
    setLoading(true);
    setErrorMessage("");

    const supabase = createClient();
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("weekly_ad_metrics")
      .select("*")
      .order("week_start", { ascending: false })
      .range(from, to);

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const newRows = data ?? [];
    setRows((prev) => (nextPage === 0 ? newRows : [...prev, ...newRows]));
    setHasMore(newRows.length === PAGE_SIZE);
    setPage(nextPage);
    setLoading(false);
  }

  useEffect(() => {
    async function run() {
      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();
      const { data, error } = await supabase
        .from("weekly_ad_metrics")
        .select("*")
        .order("week_start", { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const newRows = data ?? [];
      setRows(newRows);
      setHasMore(newRows.length === PAGE_SIZE);
      setPage(0);
      setLoading(false);
    }
    run();
  }, []);

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
      {errorMessage && <p className="p-4 text-sm text-status-critical">{errorMessage}</p>}

      <div className="divide-y divide-border-hairline sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="p-4">
            <p className="text-sm font-medium text-ink-primary">{formatWeekLabel(row.week_start)}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-ink-secondary">
              <span>{currency(row.investment_amount)}</span>
              <span>{row.impressions_count.toLocaleString("pt-BR")} impr.</span>
              <span>{row.reach_count.toLocaleString("pt-BR")} alcance</span>
              <span>{row.reported_leads_count} leads</span>
            </div>
            {row.notes && <p className="mt-1 text-xs text-ink-muted">{row.notes}</p>}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-hairline text-left text-ink-muted">
              <th className="px-5 py-3 font-medium">Semana</th>
              <th className="px-3 py-3 font-medium">Investimento</th>
              <th className="px-3 py-3 font-medium">Impressões</th>
              <th className="px-3 py-3 font-medium">Alcance</th>
              <th className="px-3 py-3 font-medium">Leads (Meta)</th>
              <th className="px-5 py-3 font-medium">Observações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border-hairline last:border-0">
                <td className="px-5 py-2.5 tabular-nums text-ink-secondary">
                  {formatWeekLabel(row.week_start)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {currency(row.investment_amount)}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {row.impressions_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {row.reach_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-ink-primary">
                  {row.reported_leads_count}
                </td>
                <td className="px-5 py-2.5 text-ink-secondary">{row.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && (
        <p className="p-4 text-sm text-ink-secondary">Nenhum lançamento ainda.</p>
      )}

      <PaginationFooter
        loading={loading}
        hasMore={hasMore}
        hasRows={rows.length > 0}
        onLoadMore={() => loadPage(page + 1)}
      />
    </div>
  );
}

function PaginationFooter({
  loading,
  hasMore,
  hasRows,
  onLoadMore,
}: {
  loading: boolean;
  hasMore: boolean;
  hasRows: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="flex justify-center border-t border-border-hairline p-3">
      {loading ? (
        <p className="text-sm text-ink-secondary">Carregando...</p>
      ) : hasMore ? (
        <button
          onClick={onLoadMore}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-ink-secondary hover:bg-ink-primary/5"
        >
          Carregar mais
        </button>
      ) : hasRows ? (
        <p className="text-xs text-ink-muted">Não há mais lançamentos.</p>
      ) : null}
    </div>
  );
}
