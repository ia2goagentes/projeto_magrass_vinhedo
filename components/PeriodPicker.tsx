"use client";

import { PERIOD_PRESETS, PeriodPresetKey, toDateKey, DateRange } from "@/lib/dates";

export type PeriodSelection = {
  presetKey: PeriodPresetKey;
  customRange?: DateRange;
  compare: boolean;
};

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-ink-secondary hover:bg-ink-primary/5"
      }`}
      style={active ? { background: "var(--brand-gradient)" } : undefined}
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-ink-secondary"
      role="switch"
      aria-checked={checked}
    >
      <span
        className="relative h-5 w-9 rounded-full transition-colors"
        style={{ background: checked ? "var(--brand-solid)" : "var(--border-hairline)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
      {label}
    </button>
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
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border-hairline bg-surface-card p-3 shadow-sm">
      {PERIOD_PRESETS.map((preset) => (
        <PresetButton
          key={preset.key}
          active={value.presetKey === preset.key}
          onClick={() => onChange({ ...value, presetKey: preset.key })}
        >
          {preset.label}
        </PresetButton>
      ))}

      <PresetButton
        active={value.presetKey === "custom"}
        onClick={() =>
          onChange({
            ...value,
            presetKey: "custom",
            customRange:
              value.customRange ?? { start: new Date(), end: new Date() },
          })
        }
      >
        Personalizado
      </PresetButton>

      {value.presetKey === "custom" && (
        <span className="flex items-center gap-2">
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
        </span>
      )}

      <div className="ml-auto">
        <ToggleSwitch
          checked={value.compare}
          onChange={(v) => onChange({ ...value, compare: v })}
          label="Comparar com período anterior"
        />
      </div>
    </div>
  );
}
