# Testing Patterns

**Analysis Date:** 2026-07-09

## Test Framework

**Runner:** None. No test runner is installed or configured.

**Assertion Library:** None.

**Test configuration files found in project root:** None (`jest.config.*`, `vitest.config.*`, `playwright.config.*` — all absent from project root).

**Test scripts in `package.json`:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

No `test`, `test:watch`, or `coverage` script exists.

**Test-related devDependencies:** None. No Jest, Vitest, Playwright, Cypress, Testing Library, or similar package appears in `package.json`.

## Test Files Found

**In `app/`:** Zero test files.

**In `components/`:** Zero test files.

**In `lib/`:** Zero test files.

**In project root:** Zero test files.

Pattern searches for `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`, and `__tests__/` directories all returned no matches within project source directories.

## Coverage Level

**Overall coverage: 0%**

No code in this project is covered by automated tests of any kind.

## What Is Tested vs Untested

### Tested
Nothing.

### Untested — All Project Code

**`lib/metrics.ts`** — Contains the most testable pure logic in the codebase. All functions are free of side effects:
- `aggregateEntries(rows)` — sums `DailyEntry[]` fields
- `aggregateWeeklyMetrics(rows)` — sums `WeeklyAdMetric[]` fields
- `computeFunnelMetrics(agg, weekly)` — derives 11 metrics from aggregated data, with null-safety for missing investment data
- `compareMetrics(current, previous)` — computes delta percentages between two metric snapshots
- `colorForMetric(value, goal)` — classifies a metric value as `green/yellow/red/neutral` against a goal
- `formatMetricValue(key, value)` — formats a metric value as currency, percent, ratio, or plain number
- `bucketEntriesByDay(rows)` / `bucketEntriesByWeek(rows)` — groups and sorts `DailyEntry[]` into time buckets

**`lib/dates.ts`** — Contains pure date utility functions with no side effects:
- `toDateKey(date)` — formats `Date` to `"yyyy-MM-dd"` string
- `getRangeForPreset(key, custom?)` — resolves a named period preset to a `DateRange`
- `getPreviousEquivalentRange(range)` — shifts a range back by its own duration
- `listDateKeysInRange(range)` — enumerates all date keys within a range
- `mondayOf(date)` / `lastCompletedMonday()` / `weeklyMetricsOverlapRange(range)` — calendar helpers

**`lib/types.ts`** — Type definitions only; no runtime logic to test.

**`components/`** — 15 UI components, none tested:
- `Sidebar.tsx` — role-based navigation link filtering logic (`visibleLinks`)
- `FunnelChart.tsx` — SVG geometry calculations (`trapezoidPoints`, `widthFor`)
- `PeriodPicker.tsx` — dropdown state, custom date range selection
- `ThemeToggle.tsx` — localStorage-based dark mode toggle
- `CostMetricCards.tsx`, `HeroSummary.tsx`, `GoalComparisonTable.tsx`, `AdMetricsPanel.tsx`, `TrendChart.tsx`, `DailyLogTable.tsx`, `MonthlyGoalCard.tsx`, `Sparkline.tsx`, `MobileNav.tsx`, `AuthCard.tsx`, `LogoutButton.tsx`

**`app/(app)/dashboard/page.tsx`** — Complex client component with Supabase data fetching, multiple `useEffect` hooks, period-based filtering, and comparison logic.

**`app/(app)/lancamento/page.tsx`** — Form with upsert logic, date-keyed data loading.

**`middleware.ts`** — Role-based route protection logic.

## Gaps in Testing

**Highest Priority (pure functions, zero setup required):**

1. `lib/metrics.ts` — The `computeFunnelMetrics`, `colorForMetric`, `compareMetrics`, and `formatMetricValue` functions are critical business logic with no dependencies. A single test file could cover edge cases: zero denominators (division guard via `safeDiv`), null investment propagation, goal threshold boundaries (90%/110% yellow bands), and locale formatting.

2. `lib/dates.ts` — `getRangeForPreset` has 8 branches covering all period presets. `listDateKeysInRange` and `getPreviousEquivalentRange` have clear invertible properties. All are pure and require only `date-fns` (already a dependency).

**Medium Priority (component logic):**

3. `components/Sidebar.tsx` — `visibleLinks` filtering by role is business-critical access control logic rendered in the UI. It should match the middleware rules in `middleware.ts`.

4. `components/FunnelChart.tsx` — `trapezoidPoints` and `widthFor` are geometric pure functions with deterministic outputs.

5. `middleware.ts` — Route protection paths are untested. Given the role-based access model, integration or unit tests covering allowed/denied path combinations per role would reduce regression risk.

**Lower Priority (Supabase-coupled pages):**

6. All page components in `app/(app)/` require mocking Supabase client calls. No mock infrastructure exists.

## Recommended Test Setup (if adding tests)

Given the stack (Next.js 16, React 19, TypeScript 5), Vitest is the natural choice — it integrates with the existing module resolution (`@/*` paths via `tsconfig.json`) without extra configuration.

**Minimum viable setup:**
- Install: `vitest`, `@vitest/coverage-v8`
- Add to `tsconfig.json` `include`: Vitest globals type (or use `/// <reference types="vitest/globals" />`)
- Add `test` script to `package.json`: `"test": "vitest run"`
- First test file: `lib/metrics.test.ts` covering `computeFunnelMetrics` and `colorForMetric`

No React component testing infrastructure (`@testing-library/react`, jsdom) would be needed for the pure-function tests in `lib/`.
