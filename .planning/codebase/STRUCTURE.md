# Codebase Structure

**Analysis Date:** 2026-07-09

## Directory Layout

```
projeto_magrass_vinhedo/
├── app/                        # Next.js App Router root
│   ├── (app)/                  # Route group — authenticated shell
│   │   ├── layout.tsx          # Server Component: auth guard + sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx        # Main analytics dashboard (client)
│   │   ├── lancamento/
│   │   │   └── page.tsx        # Daily data entry form (client)
│   │   ├── anuncios/
│   │   │   └── page.tsx        # Weekly ad metrics entry form (client)
│   │   ├── historico/
│   │   │   └── page.tsx        # Paginated log history (client)
│   │   ├── metas/
│   │   │   └── page.tsx        # Goal management table (client, gestor only)
│   │   └── usuarios/
│   │       └── page.tsx        # User role management table (client, gestor only)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # Supabase PKCE callback handler (API route)
│   ├── login/
│   │   └── page.tsx            # Login form (client)
│   ├── signup/
│   │   └── page.tsx            # Signup form (client)
│   ├── pendente/
│   │   └── page.tsx            # "Awaiting role assignment" screen (server)
│   ├── page.tsx                # Root redirect → /dashboard
│   ├── layout.tsx              # Root HTML shell, fonts, theme init script
│   ├── globals.css             # Tailwind + CSS custom property tokens
│   └── favicon.ico
├── components/                 # Shared UI components (no sub-directories)
│   ├── Sidebar.tsx             # Desktop nav sidebar + mobile top bar wrapper
│   ├── MobileNav.tsx           # Mobile hamburger drawer
│   ├── AuthCard.tsx            # Centered card wrapper for auth pages
│   ├── LogoutButton.tsx        # Logout action (compact and expanded variants)
│   ├── ThemeToggle.tsx         # Dark/light toggle (compact and expanded variants)
│   ├── PeriodPicker.tsx        # Date range selector with preset dropdown
│   ├── HeroSummary.tsx         # 4-stat hero card row (investment/revenue/closings/CAC)
│   ├── FunnelChart.tsx         # SVG funnel + conversion table
│   ├── CostMetricCards.tsx     # Grid of metric cards with sparklines and goal color
│   ├── AdMetricsPanel.tsx      # Weekly ad metrics display panel
│   ├── TrendChart.tsx          # Recharts line/bar trend chart
│   ├── GoalComparisonTable.tsx # Table of metrics vs goals with delta
│   ├── DailyLogTable.tsx       # Table of daily entries for selected period
│   ├── MonthlyGoalCard.tsx     # Progress bar for monthly closings target
│   └── Sparkline.tsx           # Tiny inline trend line (Recharts)
├── lib/                        # Pure utilities and Supabase clients
│   ├── types.ts                # Shared TypeScript types (Role, Profile, DailyEntry, etc.)
│   ├── metrics.ts              # Aggregation, computation, formatting, color logic
│   ├── dates.ts                # Date range utilities, period presets
│   └── supabase/
│       ├── client.ts           # Browser Supabase client factory
│       └── server.ts           # Server/middleware Supabase client factory
├── supabase/
│   └── schema.sql              # Full DB schema: tables, RLS, triggers, seed goals
├── middleware.ts               # Next.js edge middleware: auth + role-based routing
├── next.config.ts              # Next.js config (minimal, no customizations)
├── tsconfig.json               # TypeScript config; path alias @/* → ./
├── package.json                # Dependencies
├── postcss.config.mjs          # PostCSS (Tailwind v4)
├── eslint.config.mjs           # ESLint (eslint-config-next)
├── public/                     # Static assets
├── .planning/
│   └── codebase/               # GSD planning documents
├── CLAUDE.md                   # Project agent instructions
├── AGENTS.md                   # Next.js version warning
├── DEPLOY.md                   # Deployment and first-gestor bootstrap guide
└── README.md
```

## Directory Purposes

**`app/(app)/`:**
- Purpose: All authenticated application routes. The `(app)` route group means Next.js does not include this segment in the URL — routes are `/dashboard`, `/lancamento`, etc. (not `/(app)/dashboard`)
- Contains: One `layout.tsx` (Server Component) and six feature `page.tsx` files (all client components)
- Key files: `layout.tsx` — this is where profile is fetched and `Sidebar` receives role/name

**`app/auth/callback/`:**
- Purpose: OAuth / email-confirmation PKCE code exchange
- Contains: Single `route.ts` (GET handler)
- Key files: `route.ts` — exchanges `code` param for a Supabase session, then redirects

**`app/login/`, `app/signup/`, `app/pendente/`:**
- Purpose: Public or semi-public auth pages outside the `(app)` group (no sidebar)
- Contains: Single `page.tsx` each; login and signup are client components; pendente is a server component
- Note: `pendente/page.tsx` is the only non-`(app)` page that requires a valid session

**`components/`:**
- Purpose: All reusable UI. No sub-directories — flat structure
- Contains: 15 components spanning navigation, auth UI, charts, tables, and utility widgets
- Naming convention: PascalCase `.tsx` files, named exports matching the filename (e.g., `export function Sidebar`)

**`lib/`:**
- Purpose: Pure logic and data-access clients. No React components, no JSX
- Contains: `types.ts` (shared types), `metrics.ts` (computation), `dates.ts` (date utilities), `supabase/` (two client factories)
- Key files: `lib/metrics.ts` is the largest logic file — contains aggregation, metric computation, comparison, color scoring, and `METRIC_META` display constants

**`supabase/`:**
- Purpose: Database schema source of truth (not a Supabase CLI project — no `config.toml`)
- Contains: `schema.sql` — run manually in Supabase SQL Editor to bootstrap a new project
- Generated: No. Committed: Yes.

## Key File Locations

**Entry Points:**
- `app/page.tsx` — root redirect to `/dashboard`
- `app/layout.tsx` — HTML document shell, font loading, theme init script
- `app/(app)/layout.tsx` — authenticated shell; profile fetch, sidebar mount
- `middleware.ts` — route guard for every request

**Configuration:**
- `tsconfig.json` — defines `@/*` path alias mapping to project root
- `app/globals.css` — defines all CSS custom property tokens (colors, surfaces, status colors, brand gradient) for both light and dark modes; consumed by Tailwind `@theme inline` block
- `next.config.ts` — empty (no customizations)
- `postcss.config.mjs` — Tailwind v4 via `@tailwindcss/postcss`

**Core Logic:**
- `lib/types.ts` — all shared types (`Role`, `Profile`, `DailyEntry`, `WeeklyAdMetric`, `Goal`, `MetricKey`)
- `lib/metrics.ts` — `aggregateEntries`, `computeFunnelMetrics`, `compareMetrics`, `colorForMetric`, `formatMetricValue`, `METRIC_META`
- `lib/dates.ts` — `getRangeForPreset`, `getPreviousEquivalentRange`, `listDateKeysInRange`, `PERIOD_PRESETS`

**Supabase Clients:**
- `lib/supabase/client.ts` — `createClient()` using `createBrowserClient` (for `"use client"` pages)
- `lib/supabase/server.ts` — `createClient()` using `createServerClient` with `next/headers` cookies (for Server Components and middleware)

**Testing:**
- Not present — no test files, no test framework configured.

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase matching the exported component name — e.g., `FunnelChart.tsx` exports `FunnelChart`
- Lib utilities: camelCase — `metrics.ts`, `dates.ts`, `types.ts`
- Supabase client files: `client.ts` (browser) and `server.ts` (server)

**Directories:**
- Route groups: lowercase with parentheses — `(app)/`
- Feature routes: lowercase — `dashboard/`, `lancamento/`, `anuncios/`, `historico/`, `metas/`, `usuarios/`
- Auth routes: lowercase — `login/`, `signup/`, `pendente/`, `auth/callback/`

**Components:**
- Named exports (not default) for all shared components: `export function Sidebar`, `export function HeroSummary`, etc.
- Default exports for page and layout components (Next.js requirement)
- Variant props pattern for components that render differently in two contexts: `LogoutButton` and `ThemeToggle` both accept `variant?: "compact" | "expanded"`

**Types:**
- PascalCase for types and type aliases: `Role`, `Profile`, `DailyEntry`, `MetricKey`, `GoalDirection`
- `type` keyword used throughout (not `interface`)

## Route Structure

| URL | File | Access | Rendering |
|-----|------|--------|-----------|
| `/` | `app/page.tsx` | Public (redirect) | Server |
| `/login` | `app/login/page.tsx` | Public | Client |
| `/signup` | `app/signup/page.tsx` | Public | Client |
| `/auth/callback` | `app/auth/callback/route.ts` | Public | API Route (GET) |
| `/pendente` | `app/pendente/page.tsx` | Authenticated (pendente role) | Server |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Authenticated (any non-pendente) | Client |
| `/lancamento` | `app/(app)/lancamento/page.tsx` | `sdr` or `gestor` only | Client |
| `/anuncios` | `app/(app)/anuncios/page.tsx` | `gestor` only | Client |
| `/historico` | `app/(app)/historico/page.tsx` | Authenticated (any non-pendente) | Client |
| `/metas` | `app/(app)/metas/page.tsx` | `gestor` only | Client |
| `/usuarios` | `app/(app)/usuarios/page.tsx` | `gestor` only | Client |

## Where to Add New Code

**New authenticated page (e.g., `/relatorios`):**
- Page component: `app/(app)/relatorios/page.tsx`
- If role-restricted, add the path to `GESTOR_ONLY_PATHS` or `SDR_GESTOR_PATHS` in `middleware.ts`
- Add a nav entry to the `LINKS` array in `components/Sidebar.tsx` with the appropriate `roles` filter

**New shared UI component:**
- Implementation: `components/ComponentName.tsx` with a named export
- No barrel file exists — import directly: `import { ComponentName } from "@/components/ComponentName"`

**New metric:**
- Add the key to the `MetricKey` union in `lib/types.ts`
- Add computation logic in `computeFunnelMetrics` in `lib/metrics.ts`
- Add display metadata to `METRIC_META` in `lib/metrics.ts`
- Add a corresponding row to `public.goals` in `supabase/schema.sql`

**New utility function:**
- Date/time logic: `lib/dates.ts`
- Metric aggregation/computation/formatting: `lib/metrics.ts`
- New domain: create `lib/newUtil.ts`

**New database table:**
- Add `CREATE TABLE` and RLS policies to `supabase/schema.sql`
- Add corresponding TypeScript type to `lib/types.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD planning documents written by codebase mapper agents
- Generated: Yes (by GSD tooling)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No
- Note: `AGENTS.md` instructs Claude to read `node_modules/next/dist/docs/` before writing Next.js code, as this version (16.x) may differ from training data

---

*Structure analysis: 2026-07-09*
