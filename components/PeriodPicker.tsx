"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { PERIOD_PRESETS, PeriodPresetKey, toDateKey, DateRange } from "@/lib/dates";

export type PeriodSelection = {
  presetKey: PeriodPresetKey;
  customRange?: DateRange;
  compare: boolean;
};

const CUSTOM_LABEL = "Personalizado";

function labelFor(presetKey: PeriodPresetKey): string {
  if (presetKey === "custom") return CUSTOM_LABEL;
  return PERIOD_PRESETS.find((p) => p.key === presetKey)?.label ?? "";
}

function PeriodDropdown({
  value,
  onChange,
}: {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
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

  function selectPreset(presetKey: PeriodPresetKey) {
    onChange({
      ...value,
      presetKey,
      customRange:
        presetKey === "custom" ? (value.customRange ?? { start: new Date(), end: new Date() }) : value.customRange,
    });
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <label className="block text-xs font-medium uppercase tracking-wide text-ink-muted">
        Período
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex w-48 items-center justify-between rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm font-medium text-ink-primary"
      >
        {labelFor(value.presetKey)}
        <ChevronDown size={16} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border-hairline bg-surface-card py-1 shadow-lg">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => selectPreset(preset.key)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-primary/5"
            >
              <span
                className={value.presetKey === preset.key ? "font-medium text-ink-primary" : "text-ink-secondary"}
              >
                {preset.label}
              </span>
              {value.presetKey === preset.key && <Check size={15} className="text-accent" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectPreset("custom")}
            className="flex w-full items-center justify-between border-t border-border-hairline px-3 py-2 text-left text-sm hover:bg-ink-primary/5"
          >
            <span className={value.presetKey === "custom" ? "font-medium text-ink-primary" : "text-ink-secondary"}>
              {CUSTOM_LABEL}
            </span>
            {value.presetKey === "custom" && <Check size={15} className="text-accent" />}
          </button>
        </div>
      )}
    </div>
  );
}

export function PeriodPicker({
  value,
  onChange,
}: {
  value: PeriodSelection;
  onChange: (next: PeriodSelection) => void;
}) {
  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <PeriodDropdown value={value} onChange={onChange} />

        <button
          type="button"
          onClick={() => onChange({ ...value, compare: !value.compare })}
          className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            value.compare
              ? "bg-accent/10 text-accent"
              : "border border-border-hairline text-ink-secondary hover:bg-ink-primary/5"
          }`}
        >
          {value.compare ? "Comparando período anterior" : "Comparar com período anterior"}
        </button>
      </div>

      {value.presetKey === "custom" && (
        <div className="mt-3 flex items-center gap-2">
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
    </div>
  );
}
