"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { METRIC_META } from "@/lib/metrics";
import { Goal, MetricKey } from "@/lib/types";

const MONTHLY_GOAL_KEY = "monthly_closings_target";

type RowState = { target_value: string; direction: Goal["direction"]; saving: boolean };

const inputClass =
  "rounded-lg border border-border-hairline bg-surface-card px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-accent";

export default function MetasPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [savingMonthly, setSavingMonthly] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("goals").select("*");

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Goal[];
      setGoals(list.filter((g) => g.metric_key !== MONTHLY_GOAL_KEY));

      const monthlyGoal = list.find((g) => g.metric_key === MONTHLY_GOAL_KEY);
      setMonthlyTarget(monthlyGoal?.target_value === null || monthlyGoal?.target_value === undefined ? "" : String(monthlyGoal.target_value));

      setRows(
        Object.fromEntries(
          list.map((g) => [
            g.metric_key,
            {
              target_value: g.target_value === null ? "" : String(g.target_value),
              direction: g.direction,
              saving: false,
            },
          ])
        )
      );
      setLoading(false);
    }

    load();
  }, []);

  async function handleSave(metricKey: MetricKey) {
    const row = rows[metricKey];
    if (!row) return;

    setRows((prev) => ({ ...prev, [metricKey]: { ...row, saving: true } }));
    setErrorMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("goals")
      .update({
        target_value: row.target_value === "" ? null : Number(row.target_value),
        direction: row.direction,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("metric_key", metricKey);

    setRows((prev) => ({ ...prev, [metricKey]: { ...row, saving: false } }));

    if (error) setErrorMessage(error.message);
  }

  async function handleSaveMonthly() {
    setSavingMonthly(true);
    setErrorMessage("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("goals")
      .update({
        target_value: monthlyTarget === "" ? null : Number(monthlyTarget),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("metric_key", MONTHLY_GOAL_KEY);

    setSavingMonthly(false);
    if (error) setErrorMessage(error.message);
  }

  if (loading) return <p className="text-sm text-ink-secondary">Carregando...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Metas</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Defina a meta de cada métrica. O dashboard usa isso para colorir
        verde/amarelo/vermelho.
      </p>

      {errorMessage && <p className="mt-4 text-sm text-status-critical">{errorMessage}</p>}

      <div className="mt-6 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm">
        <p className="text-sm font-medium text-ink-primary">Meta mensal de fechamentos</p>
        <p className="mt-0.5 text-xs text-ink-secondary">
          Aparece como barra de progresso no topo do dashboard, sempre referente ao mês corrente.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Ex: 300"
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(e.target.value)}
            className={`w-32 ${inputClass}`}
          />
          <button
            onClick={handleSaveMonthly}
            disabled={savingMonthly}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--brand-gradient)" }}
          >
            {savingMonthly ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
        {/* Mobile: card list */}
        <div className="divide-y divide-border-hairline sm:hidden">
          {goals.map((goal) => {
            const row = rows[goal.metric_key];
            if (!row) return null;

            return (
              <div key={goal.metric_key} className="p-4">
                <p className="text-sm font-medium text-ink-primary">
                  {METRIC_META[goal.metric_key as MetricKey]?.label ?? goal.metric_key}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Meta"
                    value={row.target_value}
                    onChange={(e) =>
                      setRows((prev) => ({
                        ...prev,
                        [goal.metric_key]: { ...row, target_value: e.target.value },
                      }))
                    }
                    className={`w-24 ${inputClass}`}
                  />
                  <select
                    value={row.direction}
                    onChange={(e) =>
                      setRows((prev) => ({
                        ...prev,
                        [goal.metric_key]: {
                          ...row,
                          direction: e.target.value as Goal["direction"],
                        },
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="higher_is_better">Maior é melhor</option>
                    <option value="lower_is_better">Menor é melhor</option>
                  </select>
                  <button
                    onClick={() => handleSave(goal.metric_key as MetricKey)}
                    disabled={row.saving}
                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    {row.saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-hairline text-left text-ink-muted">
                <th className="px-4 py-3 font-medium">Métrica</th>
                <th className="px-4 py-3 font-medium">Meta</th>
                <th className="px-4 py-3 font-medium">Direção</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => {
                const row = rows[goal.metric_key];
                if (!row) return null;

                return (
                  <tr key={goal.metric_key} className="border-b border-border-hairline last:border-0">
                    <td className="px-4 py-3 text-ink-secondary">
                      {METRIC_META[goal.metric_key as MetricKey]?.label ?? goal.metric_key}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={row.target_value}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [goal.metric_key]: { ...row, target_value: e.target.value },
                          }))
                        }
                        className={`w-28 ${inputClass}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.direction}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [goal.metric_key]: {
                              ...row,
                              direction: e.target.value as Goal["direction"],
                            },
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="higher_is_better">Maior é melhor</option>
                        <option value="lower_is_better">Menor é melhor</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSave(goal.metric_key as MetricKey)}
                        disabled={row.saving}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: "var(--brand-gradient)" }}
                      >
                        {row.saving ? "Salvando..." : "Salvar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
