# Coding Conventions

**Analysis Date:** 2026-07-09

## TypeScript Usage

**Strict Mode:** Enabled via `tsconfig.json` (`"strict": true`). All code must satisfy TypeScript strict checks.

**Types vs Interfaces:** The codebase uses `type` exclusively — no `interface` declarations appear in project source files.

```typescript
// lib/types.ts — all domain types use `type`
export type Role = "pendente" | "sdr" | "dona" | "gestor" | "convidado";

export type DailyEntry = {
  id: string;
  entry_date: string;
  leads_count: number;
  // ...
};
```

**Union type literals** are used for constrained string values (e.g., `Role`, `MetricKey`, `GoalDirection`, `MetricColor`, `MetricFormat`).

**Const assertion** is used for tuple/array inference:

```typescript
// lib/dates.ts
export const PERIOD_PRESETS = [
  { key: "today", label: "Hoje" },
  // ...
] as const;

export type PeriodPresetKey = (typeof PERIOD_PRESETS)[number]["key"] | "custom";
```

**Non-null assertions (`!`)** are used where environment variables and Supabase queries are known to succeed (e.g., `process.env.NEXT_PUBLIC_SUPABASE_URL!`). Avoid adding more; prefer conditional checks.

**`Record<K, V>`** is the standard pattern for keyed maps:

```typescript
const ROLE_LABELS: Record<Role, string> = { ... };
export const METRIC_META: Record<MetricKey, { label: string; format: MetricFormat }> = { ... };
```

**Generic type parameters** are used explicitly on Supabase calls:

```typescript
.single<Profile>()
```

## Component Patterns

**All components are functional.** No class components.

**Client vs Server split:**
- Pages that fetch data server-side use `async function` with no `"use client"` directive (`app/(app)/layout.tsx`, `app/layout.tsx`)
- Pages/components with interactivity use `"use client"` at the top of the file
- `"use client"` appears as the very first line, before any imports

```typescript
// Client component — first line is the directive
"use client";

import { useEffect, useState } from "react";
```

**Named exports** are used for components and utilities. Only page and layout files use `export default`:

```typescript
// components/Sidebar.tsx — named export
export function Sidebar({ role, name }: { role: Role; name: string }) { ... }

// app/(app)/dashboard/page.tsx — default export (Next.js page requirement)
export default function DashboardPage() { ... }
```

**Props are typed inline** as object types directly in the function signature:

```typescript
export function HeroSummary({
  investment,
  revenue,
  closings,
  cac,
  cacGoal,
}: {
  investment: number;
  revenue: number;
  closings: number;
  cac: number | null;
  cacGoal?: Goal;
}) { ... }
```

**Variant props** use string literal union types:

```typescript
export function ThemeToggle({ variant = "compact" }: { variant?: "compact" | "expanded" }) { ... }
```

**Local state** is managed with `useState`. No global state manager is used.

**Side effects** use `useEffect` with a cleanup `active` flag pattern to avoid stale async updates:

```typescript
useEffect(() => {
  let active = true;
  async function load() {
    // ...
    if (!active) return;
    setState(...);
  }
  load();
  return () => { active = false; };
}, [dependency]);
```

**Memoization:** `useMemo` is used liberally in data-heavy pages for derived computations:

```typescript
const agg = useMemo(() => aggregateEntries(entries), [entries]);
```

**Sub-components** are defined in the same file as their parent when they are not reused elsewhere (e.g., `LogoBadge`, `PeriodDropdown` in `Sidebar.tsx` and `PeriodPicker.tsx`).

## File and Folder Naming

**Components:** `PascalCase.tsx` — one component (or a few closely related) per file, matching the primary export name. Examples: `Sidebar.tsx`, `FunnelChart.tsx`, `PeriodPicker.tsx`.

**Pages/layouts:** lowercase Next.js conventions — `page.tsx`, `layout.tsx`, `route.ts`.

**Lib files:** `camelCase.ts` — `dates.ts`, `metrics.ts`, `types.ts`.

**Route groups:** Parenthetical folder names `(app)/` follow Next.js route group convention.

**Supabase clients:** separated by context into `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server/SSR).

## Import Patterns

**Path alias `@/*`** maps to the project root. All cross-module imports use this alias:

```typescript
import { DailyEntry, Goal } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";
```

**Import order (observed pattern):**
1. React/Next.js built-ins (`"react"`, `"next/..."`)
2. Third-party packages (`"lucide-react"`, `"date-fns"`, `"recharts"`)
3. Internal aliases — `@/lib/...` before `@/components/...`

**Named imports** are used for everything except Next.js page defaults.

**Type-only imports** are not consistently used with the `import type` syntax; the codebase mixes regular imports for types and values together (e.g., `import { LucideIcon }` alongside value imports from `"lucide-react"`).

## Tailwind CSS Conventions

**Tailwind version 4** is in use, imported via `@import "tailwindcss"` in `app/globals.css`.

**Design tokens are CSS custom properties** registered via `@theme inline { }` in `app/globals.css`. Tailwind classes reference these tokens (e.g., `text-ink-primary`, `bg-surface-card`, `border-border-hairline`).

**Custom properties follow a semantic naming convention:**
- `--surface-*` — background surfaces (`surface-card`, `surface-page`)
- `--ink-*` — text colours (`ink-primary`, `ink-secondary`, `ink-muted`)
- `--border-*` — border colours (`border-hairline`)
- `--status-*` — semantic status colours (`status-good`, `status-warning`, `status-critical`)
- `--identity-*` — per-metric colour identities (`identity-blue`, `identity-green`, etc.)
- `--accent` — interactive accent colour

**Inline `style` props** are used when values come from CSS custom properties that cannot be expressed as Tailwind classes (e.g., gradients, `color-mix()`):

```tsx
style={{ background: "var(--brand-gradient)" }}
style={{ background: `color-mix(in srgb, ${identityVar} 14%, transparent)` }}
```

**Responsive prefixes** (`sm:`, `lg:`) are used directly in className strings; there are no separate mobile/desktop component trees.

**Dark mode** is implemented via the `.dark` class on `<html>`, toggled manually through `localStorage`. Dark-mode token overrides are defined in `:root.dark { }` in `app/globals.css`. Tailwind's `dark:` variant is not used — all dark-mode values come from CSS custom properties automatically switching under `:root.dark`.

**No utility abstraction layer** (no `cn()`/`clsx`). Class strings are composed with template literals and ternary expressions directly.

## Constants Pattern

Module-level `UPPER_SNAKE_CASE` constants are used for configuration arrays, maps, and derived tuples:

```typescript
const COST_CARD_KEYS: MetricKey[] = ["cpl", "cpa", "cac", "avg_ticket", "roas"];
const ROLE_LABELS: Record<Role, string> = { ... };
export const METRIC_META: Record<MetricKey, { label: string; format: MetricFormat }> = { ... };
const FIELDS: { key: keyof FormState; label: string; step?: string }[] = [ ... ];
```

## Error Handling

**UI-level errors** are stored in local state as strings and rendered inline:

```typescript
const [errorMessage, setErrorMessage] = useState("");
// ...
if (error) setErrorMessage(error.message);
// JSX:
{errorMessage && <p className="text-sm text-status-critical">{errorMessage}</p>}
```

**Async operations** use `try/catch` only implicitly through Supabase's `{ data, error }` result shape — no explicit `try/catch` blocks appear in source files.

## Comments

Comments appear selectively in Portuguese to explain business-domain reasoning:

```typescript
// Sem nenhuma semana de anúncios lançada no período, investimento é
// "sem dado" (mostra —), não "zero confirmado".
```

No JSDoc or TSDoc annotations are used anywhere in the project source files.

## Linting

**ESLint version 9** using flat config format (`eslint.config.mjs`).

**Rule sets applied:**
- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`

No project-specific rule overrides exist beyond the default ignores (`.next/`, `out/`, `build/`, `next-env.d.ts`). No Prettier configuration is present — formatting is not enforced by tooling.

**Lint command:** `npm run lint` (runs `eslint` with no additional flags — uses `eslint.config.mjs` discovery).
