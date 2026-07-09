# Technology Stack

**Analysis Date:** 2026-07-09

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code (`.ts`, `.tsx`)

**Secondary:**
- SQL (PostgreSQL dialect) - Supabase schema and RLS policies (`supabase/schema.sql`)

## Runtime

**Environment:**
- Node.js (no `.nvmrc` or `.node-version` detected — version unconstrained)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.2.10 - Full-stack React framework (App Router, Server Components, API Routes, Middleware)
- React 19.2.4 - UI rendering

**Build/Dev:**
- TypeScript compiler (via `next build` — `noEmit: true`, bundler module resolution)
- PostCSS with `@tailwindcss/postcss` ^4 — CSS processing

## Key Dependencies

**UI & Styling:**
- Tailwind CSS 4.3.2 - Utility-first CSS (`@import "tailwindcss"` in `app/globals.css`)
  - Uses v4 CSS-first config: no `tailwind.config.ts`, custom design tokens are CSS custom properties in `:root`
  - Dark mode implemented via `.dark` class on `<html>` (manual toggle + `localStorage`, not `prefers-color-scheme` media query alone)
- lucide-react 1.23.0 - Icon set
- Geist / Geist Mono fonts via `next/font/google`

**Data & Charts:**
- recharts 3.9.2 - Chart library (funnel/trend charts)
- date-fns 4.4.0 - Date manipulation (week bucketing, formatting)

**Backend / Data Layer:**
- @supabase/supabase-js 2.110.1 - Supabase JS client (auth, database queries)
- @supabase/ssr 0.12.0 - SSR-safe Supabase helpers for Next.js (cookie-based session management)

## TypeScript Configuration

**Key settings** (`tsconfig.json`):
- `target`: ES2017
- `strict`: true
- `moduleResolution`: bundler
- `jsx`: react-jsx
- Path alias: `@/*` → project root (`./`)
- `isolatedModules`: true (required by Next.js SWC compiler)

## Styling Approach

Tailwind CSS v4 with a fully custom design token system defined as CSS custom properties in `app/globals.css`. No Tailwind config file — tokens are declared via `@theme inline` block. Tokens cover:

- Surface colors: `--surface-card`, `--surface-page`
- Ink (text) colors: `--ink-primary`, `--ink-secondary`, `--ink-muted`
- Status colors: `--status-good`, `--status-warning`, `--status-serious`, `--status-critical`
- Chart colors: `--chart-blue`, `--chart-aqua`, `--chart-violet`
- Brand gradient: `--brand-gradient` (orange → pink)
- Dark mode: separate `:root.dark` block overrides the same variables

## State Management

No dedicated state management library. State is handled via:
- React `useState` / `useReducer` in Client Components
- URL/router state via `next/navigation`
- Server-side data fetching in Server Components (passed as props)
- No Zustand, Redux, Jotai, or similar detected

## Build Tooling

- `next dev` — development server (Turbopack or Webpack depending on Next 16 defaults)
- `next build` — production build
- `next start` — production server
- `eslint` — linting (no `--dir` flag set in script; called bare)

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@tailwindcss/postcss` | ^4 | PostCSS plugin for Tailwind v4 |
| `@types/node` | ^20 | Node.js type definitions |
| `@types/react` | ^19 | React type definitions |
| `@types/react-dom` | ^19 | React DOM type definitions |
| `eslint` | ^9 | Linter |
| `eslint-config-next` | 16.2.10 | Next.js ESLint rules (core-web-vitals + typescript presets) |
| `tailwindcss` | ^4 | CSS framework |
| `typescript` | ^5 | TypeScript compiler |

## ESLint Configuration

Flat config format (`eslint.config.mjs`) using:
- `eslint-config-next/core-web-vitals`
- `eslint-config-next/typescript`

---

*Stack analysis: 2026-07-09*
