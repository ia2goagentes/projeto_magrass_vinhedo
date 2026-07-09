# Codebase Concerns

**Analysis Date:** 2026-07-09

---

## Security Considerations

**Role check bypassed for `dona` and `convidado` roles in middleware:**
- Risk: The middleware only enforces path restrictions for `gestor`, `sdr`, and `pendente`. Roles `dona` and `convidado` have no path restrictions defined. `dona` can reach `/lancamento` (SDR+gestor write path) and `/anuncios`. The RLS on the database blocks the actual writes, but the UI will render those pages without restriction. If RLS were ever misconfigured the roles would have unintended write access.
- Files: `middleware.ts` lines 4–6, `components/Sidebar.tsx` lines 29–36
- Current mitigation: Supabase RLS policies block writes at the database level.
- Recommendation: Add `dona` and `convidado` to the role-path matrix in middleware to enforce least-privilege at the routing layer, not just at the DB layer.

**Supabase anon key exposed client-side (by design, but worth noting):**
- Risk: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public and embedded in client bundles. Anyone can use it to call the Supabase API directly. The only protection is RLS.
- Files: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Current mitigation: RLS is enabled on all four tables with correct policies.
- Recommendation: Periodically audit RLS policies. Add a Supabase "restricted anon key" (disable sign-ups in Supabase dashboard once the team is stable) to prevent new account registrations from unknown emails.

**No rate-limiting or CAPTCHA on signup/login:**
- Risk: The public `/signup` and `/login` pages have no bot protection. An attacker can enumerate valid emails (Supabase returns different errors for existing vs. non-existing users) and brute-force passwords.
- Files: `app/signup/page.tsx`, `app/login/page.tsx`
- Current mitigation: Supabase built-in rate limiting applies but is configurable in the dashboard.
- Recommendation: Enable Supabase Auth rate-limiting settings; consider adding a honeypot or Cloudflare Turnstile for the signup form.

**`goals` table has no `DELETE` RLS policy:**
- Risk: There is no `delete` policy on `public.goals`. If Supabase's default on absence of a delete policy is "deny", this is fine. But it is an undocumented assumption. If the default ever changes or someone adds a permissive global policy, goal rows could be deleted.
- Files: `supabase/schema.sql` lines 192–211
- Current mitigation: No delete policy defined (implicit deny in Supabase).
- Recommendation: Add an explicit `goals_delete_gestor` policy to make the intent clear.

**`weekly_ad_metrics` has no `DELETE` RLS policy:**
- Risk: Same pattern as `goals`. There is no explicit delete policy, making intent implicit.
- Files: `supabase/schema.sql` lines 174–191
- Recommendation: Add explicit `weekly_ad_metrics_delete_gestor` policy.

---

## Tech Debt

**Duplicated `initialsFor` function:**
- Issue: The helper function `initialsFor(name)` is copied verbatim in three places.
- Files: `components/Sidebar.tsx` lines 38–44, `components/MobileNav.tsx` lines 10–16, `components/usuarios/page.tsx` lines 20–26
- Impact: Any bug fix or behavioral change must be applied in three places. Risk of divergence.
- Fix approach: Extract to `lib/utils.ts` or a `components/Avatar.tsx` shared module and import from there. `Sidebar.tsx` and `MobileNav.tsx` already have an inline `Avatar`-like span that could also be a shared component.

**Duplicated `currency()` formatter:**
- Issue: A `currency(value)` function is defined identically in `components/HeroSummary.tsx` line 12 and `app/(app)/historico/page.tsx` line 22. `lib/metrics.ts` has `formatMetricValue` that covers currency for metric keys, but not for arbitrary amounts.
- Files: `components/HeroSummary.tsx`, `app/(app)/historico/page.tsx`
- Impact: Minor inconsistency risk.
- Fix approach: Add a `formatCurrency(value: number): string` export to `lib/metrics.ts` or `lib/utils.ts` and replace both usages.

**Duplicated `formatWeekLabel()` function:**
- Issue: The function that formats a week-start date key into "dd/mm a dd/mm" is defined separately in `components/AdMetricsPanel.tsx` line 3 and `app/(app)/historico/page.tsx` line 14.
- Files: `components/AdMetricsPanel.tsx`, `app/(app)/historico/page.tsx`
- Fix approach: Move to `lib/dates.ts` and export.

**Duplicated `formatDate()` / date formatting logic:**
- Issue: `app/(app)/historico/page.tsx` has a `formatDate(dateKey)` function on line 9 that splits on `-` and reverses. `components/DailyLogTable.tsx` has `formatDateLabel(dateKey)` on line 4 doing the same thing.
- Files: `app/(app)/historico/page.tsx`, `components/DailyLogTable.tsx`
- Fix approach: Export a single `formatDateKey(dateKey: string): string` from `lib/dates.ts`.

**`DailyHistory` and `WeeklyHistory` have duplicated pagination boilerplate:**
- Issue: Both subcomponents in `app/(app)/historico/page.tsx` have nearly identical state management (`rows`, `page`, `hasMore`, `loading`, `errorMessage`), a `useEffect` for initial load, and a `loadPage` function. The only difference is the Supabase table and rendered columns.
- Files: `app/(app)/historico/page.tsx` lines 60–345
- Impact: A bug in pagination logic must be fixed in two places.
- Fix approach: Extract a generic `usePaginatedQuery<T>` hook or a `PaginatedList` render component.

**`handleSubmit` in both form pages fetches user inside the submit handler:**
- Issue: `app/(app)/lancamento/page.tsx` line 96 and `app/(app)/anuncios/page.tsx` line 93 call `supabase.auth.getUser()` at submit time only to set `filled_by`. The user session is already established; calling `getUser()` again is an extra round-trip on every save.
- Files: `app/(app)/lancamento/page.tsx`, `app/(app)/anuncios/page.tsx`
- Impact: Minor performance overhead; one extra Supabase call per form submit.
- Fix approach: Store user ID in state during `useEffect` initial load (it is already loaded in the same flow) and reuse it.

**`metas/page.tsx` also calls `getUser()` in each per-row save handler:**
- Issue: `app/(app)/metas/page.tsx` `handleSave` and `handleSaveMonthly` each call `supabase.auth.getUser()` before every individual goal update.
- Files: `app/(app)/metas/page.tsx` lines 66, 89
- Fix approach: Same as above — load once in `useEffect` and store in state.

**`app/(app)/dashboard/page.tsx` is a very large client component (291 lines):**
- Issue: The entire dashboard is a single `"use client"` file fetching four Supabase queries, managing seven pieces of state, and rendering ten composed sub-components. Adding any new data source will make this file harder to maintain.
- Files: `app/(app)/dashboard/page.tsx`
- Impact: Harder to test in isolation; slow incremental loading is impossible since all data arrives in one effect.
- Fix approach: Consider splitting into smaller data-fetching hooks (`useDashboardData`, `useStaticDashboardData`) or server components that pass data to client chart islands.

---

## Performance Concerns

**Dashboard fetches all goals on every period change:**
- Problem: `goalsQuery` runs inside the period-change `useEffect` alongside `entriesQuery` and `weeklyQuery`. Goals are not period-specific — they never change between period selections.
- Files: `app/(app)/dashboard/page.tsx` lines 122–128
- Impact: One unnecessary Supabase round-trip on every period selection change.
- Fix approach: Move goals fetch to the `loadStatic` effect that runs only once on mount.

**Sparkline series computation re-runs even when `weeklyAgg` is the same object reference:**
- Problem: `sparklineSeries` depends on both `buckets` and `weeklyAgg`. `weeklyAgg` is recomputed via `useMemo` on every `weeklyRows` change, but within a single period its value is constant. Because `weeklyAgg` is a new object reference on each render, the sparkline memo fires more than necessary.
- Files: `app/(app)/dashboard/page.tsx` lines 212–224
- Impact: Minor — extra CPU on re-renders with large periods.
- Fix approach: Stable-compare `weeklyAgg` with a custom equality function or restructure so sparklines are computed with the same stable `weeklyAgg` reference.

**`listDateKeysInRange` runs twice for the same range in dashboard:**
- Problem: `listDateKeysInRange(range)` is called inside the `missingDates` `useMemo` and also directly to compute `daySpan` on line 206, both outside `useMemo`. The latter runs on every render.
- Files: `app/(app)/dashboard/page.tsx` lines 201–210
- Fix approach: Memoize `dateKeys = useMemo(() => listDateKeysInRange(range), [range])` and derive both `missingDates` and `daySpan` from it.

**`AdMetricsPanel` sorts `weeklyRows` on every render:**
- Problem: The panel spreads and sorts the full `weeklyRows` array to find `latest` on every render (line 12 of `components/AdMetricsPanel.tsx`).
- Files: `components/AdMetricsPanel.tsx` line 12
- Impact: Negligible for typical data sizes (<52 rows/year), but unnecessary when results are already ordered from the DB.
- Fix approach: Since the DB query orders by `week_start`, `weeklyRows` is already sorted. Use `weeklyRows[weeklyRows.length - 1]` instead.

**`TrendChart` re-runs `computeFunnelMetrics` for every bucket on every render:**
- Problem: `components/TrendChart.tsx` line 80 calls `computeFunnelMetrics(bucket.agg)` inside a `buckets.map()` with no memoization. If the parent re-renders without changing `buckets`, this recalculates for every time bucket.
- Files: `components/TrendChart.tsx` lines 79–87
- Impact: Negligible at typical scale, but grows with longer date ranges.
- Fix approach: Memoize in the parent before passing to `TrendChart`, or memoize inside using `useMemo`.

---

## UX / UI Gaps

**Dark mode preference is not restored on initial server render (flash of unstyled content):**
- Problem: `ThemeToggle.tsx` reads `document.documentElement.classList.contains("dark")` in a `useEffect` on mount. The inline `<Script strategy="beforeInteractive">` in `app/layout.tsx` adds the `dark` class before the first paint, which prevents a FOUC for the page background. However, the `ThemeToggle` icon renders the wrong icon for a brief moment because `isDark` initializes to `false`.
- Files: `components/ThemeToggle.tsx` lines 7–10, `app/layout.tsx` lines 6–13
- Impact: Minor visual flicker on the sidebar toggle icon on initial load.
- Fix approach: Initialize `isDark` state from a synchronous read: wrap the `localStorage` + `matchMedia` check in a lazy state initializer (needs a guard for SSR): `useState(() => typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))`.

**No confirmation dialog before overwriting an existing daily entry:**
- Problem: `app/(app)/lancamento/page.tsx` loads existing data into the form, but the submit button text is always "Salvar lançamento do dia" with no indication that clicking it will overwrite previously entered data. Users can accidentally overwrite correct historical data.
- Files: `app/(app)/lancamento/page.tsx` lines 166–173
- Impact: Data integrity risk for non-technical users.
- Fix approach: When `data` was loaded (i.e., an existing entry exists), change the button label to "Atualizar lançamento" and add a brief inline note like "Você está editando um lançamento já existente."

**No validation that `attendances + no_shows + rescheduled <= appointments` in `lancamento` form:**
- Problem: The form accepts any positive integers. A user can enter `attendances_count` greater than `appointments_count`, producing mathematically invalid funnel rates (e.g., attendance rate > 100%).
- Files: `app/(app)/lancamento/page.tsx` lines 90–122
- Impact: Corrupts downstream metrics and goal comparisons in the dashboard.
- Fix approach: Add client-side validation in `handleSubmit` before the upsert and surface an error message.

**`PeriodPicker` custom date range has no validation for `end >= start`:**
- Problem: A user can set a custom range where the end date is before the start date. `listDateKeysInRange` in `lib/dates.ts` returns an empty array when `cursor > end`, so the dashboard shows "Sem dados" with no explanation.
- Files: `components/PeriodPicker.tsx` lines 119–153, `lib/dates.ts` lines 74–85
- Impact: Confusing empty state; no error message.
- Fix approach: Add validation in `PeriodPicker` and display an inline error when `end < start`.

**`DailyLogTable` shows all days in range with `max-h-96 overflow-auto`:**
- Problem: For the "Este mês" or "Últimos 30 dias" preset, the table renders up to 31 rows in a fixed-height scrollable container inside the dashboard. But for larger custom ranges (e.g., 3+ months), it would render 90+ rows in memory at once.
- Files: `components/DailyLogTable.tsx` lines 17–67
- Impact: Minor performance concern for very large custom date ranges.
- Fix approach: Cap the rendered rows (e.g., show the most recent 60) with a note, or virtualize with a windowing library.

**Loading state for the dashboard is a plain text "Carregando..." string:**
- Problem: During the initial data fetch, the entire dashboard content area shows `<p className="text-sm text-ink-secondary">Carregando...</p>` with no skeleton or structural placeholder.
- Files: `app/(app)/dashboard/page.tsx` lines 242–244
- Impact: Layout shift on load; poor perceived performance.
- Fix approach: Replace with skeleton cards matching the approximate shape of `HeroSummary` and `FunnelChart`.

**`MobileNav` dropdown does not close on navigation (only on link click):**
- Problem: `MobileNav` passes `onClick={() => setOpen(false)}` to each Link. However, if the user uses the browser's back button while the menu is open, the menu remains open on the previous page.
- Files: `components/MobileNav.tsx` lines 51–53
- Impact: Minor UX inconsistency.
- Fix approach: Add a `useEffect` that closes the menu when `pathname` changes.

**`app/(app)/usuarios/page.tsx` loads all user profiles without pagination:**
- Problem: The profiles page does a `select("*").order("created_at")` with no `.range()` limit. For a clinic with many users this is fine (likely <50 ever), but there is no guard.
- Files: `app/(app)/usuarios/page.tsx` lines 48–51
- Impact: Negligible at this scale; not a scalability concern for a single clinic.

**No `aria-label` or accessible label on metric cards in `CostMetricCards`:**
- Problem: Each metric card is a `<div>` with a truncated value. There is no `role`, `aria-label`, or visually hidden text associating the icon, label, and value for screen readers.
- Files: `components/CostMetricCards.tsx`
- Impact: Low — this is an internal business tool, not a public-facing product — but worth noting for future accessibility work.

---

## Missing Features / Incomplete Implementations

**No "forgot password" flow:**
- Problem: The login page links to signup but there is no password reset link or page.
- Files: `app/login/page.tsx`
- Impact: Any team member who forgets their password must contact the Supabase administrator to reset it manually.
- Fix approach: Add a `/forgot-password` page that calls `supabase.auth.resetPasswordForEmail()`.

**No notification mechanism for pending users:**
- Problem: When a new user signs up, they land on `/pendente` with no action they can take. The gestor has no in-app notification that someone is waiting. They must discover it by visiting `/usuarios`.
- Files: `app/pendente/page.tsx`, `app/(app)/usuarios/page.tsx`
- Impact: New team members may wait indefinitely without knowing the gestor has not seen their registration.
- Fix approach: Add an email notification via Supabase trigger (e.g., using a Supabase Edge Function or a `pg_net` HTTP call from the `handle_new_user` trigger) when a new user registers.

**`convidado` role has no defined purpose or access scope:**
- Problem: `convidado` is defined as a valid role in `lib/types.ts` and `supabase/schema.sql`, and is selectable in the user management UI, but it has no unique permissions or behavior distinct from `sdr`. It is not restricted from any path, and it can read all tables (because all read policies use `authenticated`).
- Files: `lib/types.ts` line 1, `supabase/schema.sql` line 15
- Impact: Ambiguous role assignment. A gestor assigning `convidado` may expect restricted access but the user gets the same read access as `sdr`.
- Fix approach: Either remove the role, document its intended scope, or add middleware path restrictions for it.

**`goals` rows can only be updated, never inserted from the UI (new metric keys are not covered):**
- Problem: `app/(app)/metas/page.tsx` only calls `.update()`, never `.insert()`. The initial goal rows are seeded in `supabase/schema.sql` with `on conflict do nothing`. If the application ever adds a new `MetricKey`, its goal row must be inserted manually in SQL.
- Files: `app/(app)/metas/page.tsx`, `supabase/schema.sql` lines 68–81
- Fix approach: Change the save handler to use `.upsert()` on `metric_key`.

**No data export feature:**
- Problem: There is no way to export historical data (daily entries, weekly ad metrics) to CSV or Excel. The clinic manager likely needs this for reporting or offline analysis.
- Impact: Medium — operational need for a business-facing dashboard.

**`sparklineSeries` in dashboard uses `weeklyAgg` for the entire period, not per-bucket:**
- Problem: `computeFunnelMetrics(bucket.agg, weeklyAgg)` passes the full-period `weeklyAgg` to every single daily/weekly bucket. This means every bucket's cost metrics (CPL, CPA, CAC, ROAS) are calculated using the same period-total investment, not the investment for that specific sub-period. The sparklines for cost metrics are therefore constant flat lines when `weeklyAgg.investment` is non-zero.
- Files: `app/(app)/dashboard/page.tsx` lines 212–223
- Impact: Sparklines for `cpl`, `cpa`, `cac`, `roas` are misleading — they show a flat line even when the metrics vary over time.
- Fix approach: For each bucket, join the corresponding weekly ad metrics to get per-bucket investment, or acknowledge the limitation in the UI.

---

## Scaling Limits

**Single-clinic design hardcoded throughout:**
- Current capacity: The schema has no `clinic_id` or `tenant_id` column. All data belongs to one implicit clinic.
- Limit: Cannot serve more than one clinic without a full schema migration.
- Scaling path: Add `clinic_id` to all tables, update RLS policies to scope by clinic, and add a `clinics` table. This is a significant architectural change if multi-tenancy is ever needed.

**`daily_entries` enforces uniqueness on `entry_date` globally:**
- Current design: `entry_date date not null unique` in `supabase/schema.sql` line 23.
- Limit: Only one entry per calendar date, ever. This is correct for a single clinic but would break immediately in a multi-tenant scenario.
- Files: `supabase/schema.sql` line 23

---

## Dependencies at Risk

**`lucide-react` at version `^1.23.0` (major version 1):**
- Risk: Lucide React was at `0.x` for a long time and its `1.x` release may have introduced breaking icon renames. The `^` range will accept `1.x.x` but not `2.x`. This is currently fine but worth monitoring.
- Files: `package.json`

**`recharts ^3.9.2` — relatively new major version:**
- Risk: Recharts 3.x was a major rewrite. The custom `TooltipEntry` and `LegendEntry` types in `TrendChart.tsx` are defined locally because the Recharts types were not compatible. If the package is updated, these type shims may need adjustment.
- Files: `components/TrendChart.tsx` lines 28–29, 59

---

## Test Coverage Gaps

**Zero automated tests:**
- What is not tested: Every component, every utility function, every route handler, every middleware rule.
- Files: Entire codebase — no `*.test.*` or `*.spec.*` files exist anywhere.
- Risk: Any refactoring is performed entirely by manual QA. The metric calculation logic in `lib/metrics.ts` (division-by-zero guards, `safeDiv`, `colorForMetric` thresholds, `computeFunnelMetrics` investment null handling) is correctness-critical with no regression protection.
- Priority: HIGH — `lib/metrics.ts` and `lib/dates.ts` should be unit-tested first as they are pure functions with no external dependencies.

---

*Concerns audit: 2026-07-09*
