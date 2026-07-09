import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type DateRange = { start: Date; end: Date };

export const PERIOD_PRESETS = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "this_week", label: "Esta semana" },
  { key: "last_week", label: "Semana passada" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês passado" },
] as const;

export type PeriodPresetKey = (typeof PERIOD_PRESETS)[number]["key"] | "custom";

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getRangeForPreset(key: PeriodPresetKey, custom?: DateRange): DateRange {
  const now = new Date();

  switch (key) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) };
    case "last_week": {
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
      };
    }
    case "this_month":
      return { start: startOfMonth(now), end: endOfDay(now) };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case "custom":
      if (!custom) throw new Error("Período customizado requer start/end.");
      return { start: startOfDay(custom.start), end: endOfDay(custom.end) };
  }
}

export function getPreviousEquivalentRange(range: DateRange): DateRange {
  const daySpan = differenceInCalendarDays(range.end, range.start) + 1;
  const end = subDays(range.start, 1);
  const start = subDays(end, daySpan - 1);
  return { start: startOfDay(start), end: endOfDay(end) };
}

export function listDateKeysInRange(range: DateRange): string[] {
  const keys: string[] = [];
  let cursor = startOfDay(range.start);
  const end = startOfDay(range.end);

  while (cursor <= end) {
    keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
  }

  return keys;
}

export function mondayOf(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function lastCompletedMonday(): Date {
  return subWeeks(mondayOf(new Date()), 1);
}

export function weeklyMetricsOverlapRange(range: DateRange): DateRange {
  return { start: subDays(range.start, 6), end: range.end };
}
