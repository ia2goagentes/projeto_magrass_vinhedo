# Architecture

**Analysis Date:** 2026-07-09

## Pattern Overview

**Overall:** Next.js 16 App Router — full-stack React with server and client components, Supabase as the sole backend (auth + database + RLS).

**Key Characteristics:**
- Route groups (`(app)`) separate authenticated app shell from public auth pages
- No API routes for data — all database access is done directly from client or server components via the Supabase JS client
- Authorization enforced in two places: Next.js middleware (redirect logic) and Supabase RLS policies (DB-level)
- All data fetching in the main dashboard is client-side (`"use client"`) using `useEffect` + Supabase browser client; data entry pages follow the same pattern
- The `(app)` group layout is a Server Component that fetches the user's profile and passes `role` and `name` as props to the `Sidebar`

## Layers

**Middleware (route guard):**
- Purpose: Intercepts every request, validates Supabase session, reads `profiles.role`, and redirects based on role
- Location: `middleware.ts`
- Contains: Auth check, role-based path restrictions, redirect logic
- Depends on: `@supabase/ssr` `createServerClient`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Used by: Next.js runtime on every non-static request

**App Shell (Server Component layout):**
- Purpose: Secondary auth guard, fetches the user's full profile, renders the `Sidebar` with role/name
- Location: `app/(app)/layout.tsx`
- Contains: Supabase server client call, role redirect for `pendente`, layout JSX
- Depends on: `lib/supabase/server.ts`, `components/Sidebar.tsx`, `lib/types.ts`
- Used by: All routes under `app/(app)/`

**Page Components:**
- Purpose: Each route owns its own data loading (via `useEffect`) and UI rendering. No shared data layer between pages.
- Location: `app/(app)/*/page.tsx` (all marked `"use client"`)
- Contains: Local state, Supabase queries, derived metric computation, component composition
- Depends on: `lib/supabase/client.ts`, `lib/metrics.ts`, `lib/dates.ts`, `lib/types.ts`, `components/*`
- Used by: App Router renderer

**Lib — Pure Logic:**
- Purpose: Stateless computation utilities — no side effects, no Supabase calls
- Location: `lib/metrics.ts`, `lib/dates.ts`, `lib/types.ts`
- Contains: Aggregation functions, metric computations, date range utilities, shared TypeScript types
- Depends on: `date-fns` only
- Used by: Page components and some display components

**Supabase Clients:**
- Purpose: Two separate client factories — one for server (RSC/middleware), one for browser
- Location: `lib/supabase/server.ts` (server), `lib/supabase/client.ts` (browser)
- Contains: `createServerClient` / `createBrowserClient` wrappers with cookie handling
- Depends on: `@supabase/ssr`
- Used by: middleware, server layouts, all client pages

**UI Components:**
- Purpose: Presentational and interactive components; most are pure props-in/JSX-out
- Location: `components/`
- Contains: Charts, tables, navigation, auth wrappers, pickers
- Depends on: `lib/metrics.ts` (for formatting/color logic), `lib/types.ts`, `lucide-react`, `recharts`
- Used by: Page components

## Data Flow

**Dashboard read path:**

1. User lands on `/dashboard`; middleware validates session and role via Supabase cookie
2. `app/(app)/layout.tsx` (Server Component) fetches `profiles` row, passes `role`/`name` to `Sidebar`
3. `DashboardPage` (`"use client"`) mounts; two `useEffect` hooks fire:
   - Static hook: fetches `profiles.name`, current-month `closings_count`, `monthly_closings_target` goal
   - Period-dependent hook: fetches `daily_entries`, `weekly_ad_metrics`, and `goals` for the selected date range
4. Raw rows flow through pure functions: `aggregateEntries()` → `computeFunnelMetrics()` → `compareMetrics()` → `colorForMetric()`
5. Aggregated data and computed metrics are passed as props to display components (`HeroSummary`, `FunnelChart`, `CostMetricCards`, etc.)

**Data entry write path (Lancamento / Anuncios):**

1. User selects a date; `useEffect` loads existing row via `supabase.from(...).select().eq(...).maybeSingle()`
2. User edits form fields (controlled React state)
3. On submit, `supabase.from(...).upsert(..., { onConflict: "entry_date" | "week_start" })` writes the record
4. Supabase RLS policy blocks writes if `current_role()` is not in the allowed set

**Auth flow:**

1. `/signup` calls `supabase.auth.signUp()` with `{ data: { name } }` in options
2. Supabase trigger `on_auth_user_created` fires, inserts a `profiles` row with `role = 'pendente'`
3. If email confirmation is enabled, user is shown a confirmation notice; otherwise redirected to `/pendente`
4. `/login` calls `supabase.auth.signInWithPassword()`, then `router.push("/dashboard")`
5. OAuth callback route `app/auth/callback/route.ts` handles PKCE: exchanges `code` for session, redirects to `/dashboard`
6. Middleware on every subsequent request reads the session cookie and validates role

**State Management:**
- No global state manager (no Zustand, Redux, or React Context). Each page manages its own local state with `useState` + `useEffect`.
- Theme (dark/light) stored in `localStorage` and applied via a `<Script strategy="beforeInteractive">` inline script in `app/layout.tsx` to prevent flash.

## Key Abstractions

**Role system:**
- Type: `Role = "pendente" | "sdr" | "dona" | "gestor" | "convidado"` in `lib/types.ts`
- Enforced at three levels: middleware redirects, Sidebar nav filtering, and Supabase RLS policies
- Role labels: `middleware.ts` defines `GESTOR_ONLY_PATHS` and `SDR_GESTOR_PATHS`; `Sidebar.tsx` defines `NavLink.roles`

**MetricKey union:**
- Defined in `lib/types.ts` as a union of all computed metric identifiers (e.g., `"cpl"`, `"roas"`, `"cac"`)
- `METRIC_META` in `lib/metrics.ts` maps each key to `{ label, format }` — single source of truth for display strings and number formatting
- `goals` table uses `metric_key` as its primary identifier, joining computed metrics to their targets

**DailyEntry / WeeklyAdMetric separation:**
- Daily entries: operational funnel data filled by SDR (leads, appointments, attendances, closings, revenue)
- Weekly ad metrics: paid traffic data filled by gestor (investment, impressions, reach, Meta-reported leads)
- Investment is kept in `weekly_ad_metrics` only; CPL/CAC/ROAS compute to `null` when no weekly data overlaps the selected period

## Entry Points

**Root redirect:**
- Location: `app/page.tsx`
- Triggers: Any visit to `/`
- Responsibilities: Immediate `redirect("/dashboard")`

**Root layout:**
- Location: `app/layout.tsx`
- Triggers: Every page
- Responsibilities: HTML shell, Geist fonts, theme init script (prevents dark-mode flash), global CSS

**App group layout:**
- Location: `app/(app)/layout.tsx`
- Triggers: Any route under `/(app)/` (dashboard, lancamento, anuncios, historico, metas, usuarios)
- Responsibilities: Auth verification, profile fetch, sidebar render, main content wrapper

**Auth callback:**
- Location: `app/auth/callback/route.ts`
- Triggers: Supabase redirects here after email confirmation
- Responsibilities: `exchangeCodeForSession`, redirect to `/dashboard` or `/login`

## Error Handling

**Strategy:** Inline error state per page — no error boundaries, no global error handler.

**Patterns:**
- Each page holds an `errorMessage` string in local state; Supabase errors set it via `setErrorMessage(res.error.message)`
- Displayed inline as `<p className="text-sm text-status-critical">{errorMessage}</p>`
- Missing data for a period shown as a warning banner (AlertTriangle icon) on the dashboard
- Null-safe metric values: `computeFunnelMetrics` returns `number | null` for each key; `formatMetricValue` renders `"—"` for null

## Cross-Cutting Concerns

**Logging:** None — no logging framework; errors surface only in the browser console or via inline UI messages.

**Validation:** Client-side only — HTML `required`, `min`, `type="number"` on form inputs; no Zod or server-side schema validation.

**Authentication:** Supabase Auth (email + password). Session managed via cookies (`@supabase/ssr`). Middleware re-validates on every request. No JWT parsing in application code — `supabase.auth.getUser()` is the sole auth check.

**Dark mode:** CSS custom property tokens defined for both `:root` and `:root.dark` in `app/globals.css`. Theme toggled by adding/removing `dark` class on `<html>` element; persisted to `localStorage`.

**Responsive layout:** Tailwind breakpoints. Sidebar is `hidden lg:flex` (fixed, 256px wide). Mobile uses a sticky top bar with a hamburger `MobileNav` overlay. Many data tables have a mobile card-list variant and a desktop `sm:block` table variant.
