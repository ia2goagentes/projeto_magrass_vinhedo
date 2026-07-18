"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { endOfDay, startOfDay, startOfMonth, subDays } from "date-fns";
import { DateRange, toDateKey } from "@/lib/dates";

export type LeadDatePresetKey =
  | "all"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "custom";

export type LeadFilters = {
  search: string;
  presetKey: LeadDatePresetKey;
  customRange?: DateRange;
};

export const EMPTY_LEAD_FILTERS: LeadFilters = { search: "", presetKey: "all" };

const PRESETS: { key: LeadDatePresetKey; label: string }[] = [
  { key: "all", label: "Todo o período" },
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "last_7_days", label: "Últimos 7 dias" },
  { key: "this_month", label: "Este mês" },
  { key: "custom", label: "Personalizado" },
];

// null = sem recorte de data (mostra tudo)
export function getLeadDateRange(filters: LeadFilters): DateRange | null {
  const now = new Date();

  switch (filters.presetKey) {
    case "all":
      return null;
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "last_7_days":
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "this_month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "custom": {
      if (!filters.customRange) return null;
      return {
        start: startOfDay(filters.customRange.start),
        end: endOfDay(filters.customRange.end),
      };
    }
  }
}

// Busca por nome ignorando acentos e caixa ("jose" encontra "José")
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function matchesLeadFilters(
  lead: { name: string; created_at: string },
  filters: LeadFilters
): boolean {
  const search = normalize(filters.search);
  if (search && !normalize(lead.name).includes(search)) return false;

  const range = getLeadDateRange(filters);
  if (range) {
    const createdAt = new Date(lead.created_at);
    if (createdAt < range.start || createdAt > range.end) return false;
  }

  return true;
}

function PresetDropdown({
  value,
  onChange,
}: {
  value: LeadFilters;
  onChange: (next: LeadFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPreset(presetKey: LeadDatePresetKey) {
    onChange({
      ...value,
      presetKey,
      customRange:
        presetKey === "custom"
          ? (value.customRange ?? { start: new Date(), end: new Date() })
          : value.customRange,
    });
    setOpen(false);
  }

  const label = PRESETS.find((p) => p.key === value.presetKey)?.label ?? "";

  return (
    <div className="relative w-full sm:w-48" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm font-medium text-ink-primary"
      >
        {label}
        <ChevronDown size={16} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border-hairline bg-surface-card py-1 shadow-lg">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => selectPreset(preset.key)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-primary/5"
            >
              <span
                className={
                  value.presetKey === preset.key
                    ? "font-medium text-ink-primary"
                    : "text-ink-secondary"
                }
              >
                {preset.label}
              </span>
              {value.presetKey === preset.key && <Check size={15} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LeadsFilterBar({
  value,
  onChange,
  resultCount,
  totalCount,
}: {
  value: LeadFilters;
  onChange: (next: LeadFilters) => void;
  resultCount: number;
  totalCount: number;
}) {
  const isFiltering = value.search.trim() !== "" || value.presetKey !== "all";

  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Buscar lead por nome..."
            className="w-full rounded-lg border border-border-hairline bg-surface-card py-2 pl-9 pr-3 text-sm text-ink-primary outline-none focus:border-accent"
          />
        </div>

        <PresetDropdown value={value} onChange={onChange} />

        {isFiltering && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_LEAD_FILTERS)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border-hairline px-3 py-2 text-sm text-ink-secondary transition hover:bg-ink-primary/5"
          >
            <X size={15} />
            Limpar
          </button>
        )}
      </div>

      {value.presetKey === "custom" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={toDateKey(value.customRange?.start ?? new Date())}
            onChange={(e) =>
              onChange({
                ...value,
                customRange: {
                  start: new Date(`${e.target.value}T00:00:00`),
                  end: value.customRange?.end ?? new Date(`${e.target.value}T00:00:00`),
                },
              })
            }
            className="rounded-lg border border-border-hairline bg-surface-card px-2 py-1 text-sm text-ink-primary"
          />
          <span className="text-sm text-ink-muted">até</span>
          <input
            type="date"
            value={toDateKey(value.customRange?.end ?? new Date())}
            onChange={(e) =>
              onChange({
                ...value,
                customRange: {
                  start: value.customRange?.start ?? new Date(`${e.target.value}T00:00:00`),
                  end: new Date(`${e.target.value}T00:00:00`),
                },
              })
            }
            className="rounded-lg border border-border-hairline bg-surface-card px-2 py-1 text-sm text-ink-primary"
          />
        </div>
      )}

      {isFiltering && (
        <p className="mt-3 text-sm text-ink-secondary">
          Mostrando <strong className="text-ink-primary">{resultCount}</strong> de {totalCount} leads.
        </p>
      )}
    </div>
  );
}
