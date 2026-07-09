---
phase: 3
plan: 1
subsystem: crm
tags: [leads, crm, realtime, supabase, tailwind-v4]
dependency_graph:
  requires: [lib/types.ts (Lead, LeadStatus, LEAD_STATUS_LABELS), public.leads table (Phase 1)]
  provides: [/leads page, LeadStatusBadge component, Sidebar Leads link]
  affects: [components/Sidebar.tsx]
tech_stack:
  added: []
  patterns: [optimistic-update, supabase-realtime, inline-editing, tab-filter]
key_files:
  created:
    - app/(app)/leads/page.tsx
    - components/LeadStatusBadge.tsx
  modified:
    - components/Sidebar.tsx
decisions:
  - Leads link restricted to sdr and gestor roles (not dona) — dona sees no data via RLS anyway, but hiding the nav link is cleaner UX
  - Status dropdown shown alongside badge in same cell to keep table compact and avoid hover-only patterns that fail on mobile
  - Note cell is click-to-edit inline (no modal) — textarea with Ctrl+Enter shortcut and Escape to cancel
  - Toast auto-dismisses after 6 seconds; clicking also dismisses — no permanent notification store needed for MVP
  - WhatsApp link built as wa.me/55{digits} — strips non-digit chars and removes leading 55 if already present to avoid double-prefix
  - Realtime subscription uses postgres_changes INSERT event only — UPDATE/DELETE events not needed for MVP toast notification
metrics:
  duration: ~30 min
  completed: 2026-07-09
  tasks_completed: 5
  files_created: 2
  files_modified: 1
---

# Phase 3 Plan 1: CRM Lead Management UI Summary

Implemented full CRM leads management UI at `/leads` using Supabase browser client, Tailwind v4 CSS tokens, and Realtime subscriptions — enabling the SDR to replace her Google Sheets tracker with an integrated in-app experience.

## What Was Built

### CRM-01 — Leads list page (`/leads`)

- `app/(app)/leads/page.tsx` — client component fetching `public.leads` ordered by `created_at DESC`
- Columns: Nome, WhatsApp (link `wa.me/55{number}`), Status (badge + dropdown), Nota, Criado em
- Skeleton loading (animated pulse) instead of "Carregando..." spinner
- Empty state messages differentiate "no leads at all" from "no leads for this filter"
- Row count footer shows how many leads are visible

### CRM-02 — Status filter tabs

- 9 tabs: Todos / Novo / Contatado / Agendado / Compareceu / No-show / Comprou / Perdido / Sem interesse
- Count badge per tab (only shows when count > 0)
- Active tab highlighted with `border-accent text-accent` underline
- Filter happens client-side — single fetch, no extra queries per tab switch

### CRM-03 — Inline status dropdown with optimistic update

- `<StatusDropdown>` renders a `<select>` pre-filled with current status
- `handleStatusChange` updates local state immediately (optimistic) — the `setLeads` call fires before the Supabase `update` resolves
- RLS policy `leads_update_sdr_gestor` enforces server-side authorization
- `dona` role sees data via SELECT policy but `update` is blocked by RLS

### CRM-04 — Inline note editing

- `<NoteCell>` uses click-to-edit pattern: shows note text (or "Adicionar nota..." placeholder) when idle
- Click reveals textarea with Save/Cancel buttons
- Keyboard shortcuts: `Ctrl+Enter` to save, `Escape` to cancel
- `UPDATE leads SET notes = $1 WHERE id = $2` — stores `null` for empty string to keep DB clean
- Parent state updated via `onSaved` callback to keep UI in sync without refetch

### CRM-05 — Realtime toast notifications

- Supabase channel `"leads-realtime"` subscribed to `postgres_changes` INSERT events on `public.leads`
- Each new lead triggers `addToast("Novo lead: {name}")` — visible within seconds of webhook ingest
- Toast auto-dismisses after 6 seconds; clicking dismisses immediately
- Channel cleaned up on component unmount via `supabase.removeChannel(channel)`

### `components/LeadStatusBadge.tsx`

Color-coded badges using Tailwind utility classes mapped per status:

| Status | Color |
|--------|-------|
| novo | blue |
| contatado | purple |
| agendado | amber |
| compareceu | teal |
| no_show | orange |
| comprou | green |
| perdido | red |
| sem_interesse | gray |

Dark mode variants included via `dark:` classes.

### `components/Sidebar.tsx`

Added `UserCheck` icon import and `{ href: "/leads", label: "Leads", icon: UserCheck, roles: ["sdr", "gestor"] }` entry positioned between Dashboard and Lançamento diário.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is fetched from `public.leads` via Supabase browser client. The page will show an empty state until the `leads` table is populated (requires Phase 1 schema to be applied in Supabase and webhook to be active).

## Self-Check: PASSED

- `app/(app)/leads/page.tsx` — created (git hash: 7d11dd5)
- `components/LeadStatusBadge.tsx` — created (git hash: 1b6945b)
- `components/Sidebar.tsx` — modified (git hash: 5eda4da)

## Commits

| Hash | Message |
|------|---------|
| 1b6945b | feat(03): add LeadStatusBadge component with color-coded status badges |
| 5eda4da | feat(03): add Leads nav link to Sidebar for sdr and gestor roles |
| 7d11dd5 | feat(03): CRM de leads - lista, filtros, status inline, notas, realtime |
