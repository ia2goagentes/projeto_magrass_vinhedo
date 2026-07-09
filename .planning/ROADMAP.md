# Roadmap — v1.1 Lead Pipeline + Dashboard Upgrade

## Overview

4 phases | 21 requirements | Replace the Google Sheets lead tracker with an integrated CRM that auto-receives leads from Make/Meta, gives the SDR a single workspace, and feeds real funnel data into the dashboard.

---

## Phases

- [ ] **Phase 1: Schema + Webhook Foundation** - Supabase leads table, RLS, service-role client, middleware bypass, and webhook endpoint — everything else blocks on this
- [ ] **Phase 2: Dashboard CRM Integration + Visual Upgrade** - Dashboard reads real lead metrics without double-counting, broken sparklines fixed, skeleton loading and modern card design
- [ ] **Phase 3: CRM Lead Management UI** - SDR leads page with status management, notes, filters, and Realtime notifications
- [ ] **Phase 4: UX Fixes** - Forgot password, form overwrite warning, funnel validation, dark mode flash

---

## Phase Details

### Phase 1: Schema + Webhook Foundation
**Goal**: The system accepts and persists leads from Make idempotently, with the correct security surface (middleware bypass, secret validation, service-role DB writes, RLS-protected schema)
**Depends on**: Nothing (foundation)
**Requirements**: INGST-01, INGST-02, INGST-03, INGST-04
**Success Criteria** (what must be TRUE):
  1. A `curl -X POST /api/leads/ingest` with a valid `x-webhook-secret` header and lead payload returns `200` and the lead appears in the Supabase `leads` table
  2. Sending the same Make payload twice (same `lead_source_id`) results in exactly one row in `leads` — no error is returned on the second call
  3. A WhatsApp number sent as `+55 (11) 9 1234-5678` is stored as `5511912345678` (digits only)
  4. The `answers` column stores the three Meta form question responses as JSONB — no separate column per question exists in the schema
  5. A request to `/api/leads/ingest` without the correct secret header returns `401` without redirecting (middleware bypass confirmed working)
**Plans**: 2 plans
- [ ] 01-01-PLAN.md — Infrastructure Foundation (schema DDL, types, service client, middleware bypass, env vars) [wave 1]
- [ ] 01-02-PLAN.md — Webhook Endpoint (POST /api/leads/ingest + curl smoke suite) [wave 2, depends on 01-01]

### Phase 2: Dashboard CRM Integration + Visual Upgrade
**Goal**: The dashboard displays agendamentos, comparecimentos, and fechamentos derived from lead statuses — not re-entered manually — with no double-counting and with a polished, fast-loading visual presentation
**Depends on**: Phase 1 (requires populated `leads` table and `lead_funnel_by_status` view)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. Dashboard shows an "Agendamentos (CRM)" count that matches the number of leads with status `Agendado`, `Compareceu`, `No-show`, `Comprou` — without requiring manual daily entry
  2. Selecting a date range that predates the webhook go-live still shows correct historical data sourced from `daily_entries`, not zeros
  3. A "Leads por Status" card on the dashboard displays counts per status for the current month, sourced from the CRM
  4. Sparklines for CPL, CPA, CAC, and ROAS show distinct variation over time — the flat-line bug is gone
  5. Dashboard cards display animated skeleton placeholders (not "Carregando...") during the initial data fetch
**Plans**: TBD
**UI hint**: yes

### Phase 3: CRM Lead Management UI
**Goal**: The SDR has a working leads page at `/leads` where she can see every lead, update statuses, write notes, filter by pipeline stage, and be notified when a new lead arrives — eliminating the need for the Google Sheets tracker
**Depends on**: Phase 1 (requires `leads` table and schema)
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, CRM-05
**Success Criteria** (what must be TRUE):
  1. SDR can open `/leads` and see a table of all leads with name, WhatsApp as a `wa.me` link, current status, and creation date
  2. SDR can click a status tab (e.g., "Agendado") and see only leads in that stage — all other leads are hidden
  3. SDR can change a lead's status via an inline dropdown and the UI updates immediately (optimistic) without a full page reload
  4. SDR can open a lead, type a note, save it, and see the saved note on the next visit
  5. While `/leads` is open, a toast notification appears within seconds of a new lead being ingested by the webhook — no page refresh required
**Plans**: TBD
**UI hint**: yes

### Phase 4: UX Fixes
**Goal**: The three highest-friction UX gaps are closed: users can recover their own password, the daily entry form warns before overwriting, and funnel input validation prevents impossible numbers
**Depends on**: Nothing (independent of all CRM work)
**Requirements**: UX-01, UX-02, UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. A user who has forgotten their password can visit `/forgot-password`, enter their email, and receive a Supabase password-reset email — without contacting the administrator
  2. When the SDR opens `/lancamento` on a day that already has an entry, the submit button reads "Atualizar lançamento" and an inline warning is visible before they save
  3. If the SDR enters `attendances + no_shows + rescheduled > appointments`, the form displays a validation error and blocks submission
  4. The theme toggle icon (sun/moon) renders in the correct state on first paint — no flash between wrong and correct icon on load
**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema + Webhook Foundation | 0/2 | Not started | - |
| 2. Dashboard CRM Integration + Visual Upgrade | 0/? | Not started | - |
| 3. CRM Lead Management UI | 0/? | Not started | - |
| 4. UX Fixes | 0/? | Not started | - |
