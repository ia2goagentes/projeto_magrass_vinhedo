---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
status: executing
last_updated: "2026-07-09T20:00:00.000Z"
last_activity: 2026-07-09 -- Plan 01-01 complete (Tasks 1-5); paused at Task 6 checkpoint (human-verify)
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 50
---

# GSD State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-09)

**Core value:** SDR e gestor enxergam o funil completo — de lead a venda fechada — em um único lugar, sem depender de planilhas externas.
**Current focus:** Phase 01 — Schema + Webhook Foundation (waiting on human checkpoint before Plan 02)

## Current Position

Milestone: v1.1 Lead Pipeline + Dashboard Upgrade
Phase: 01 (Schema + Webhook Foundation) — PAUSED AT CHECKPOINT
Plan: 2 of 2 (Plan 01-01 complete; Plan 01-02 is webhook route — blocked until checkpoint clears)
Status: Waiting on human-verify checkpoint (Task 6): user must run DDL in Supabase, fill env vars, confirm curl returns 404
Last activity: 2026-07-09 -- Plan 01-01 complete (Tasks 1-5); paused at Task 6 checkpoint (human-verify)

Progress: [█████░░░░░] 50% (1/2 plans in Phase 01 complete)

## Roadmap Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 — Schema + Webhook Foundation | System accepts and persists leads from Make idempotently | INGST-01–04 | Plan 01-01 done; Plan 01-02 blocked on checkpoint |
| 2 — Dashboard CRM Integration + Visual Upgrade | Dashboard shows real CRM metrics, sparkline bug fixed, skeleton loading | DASH-01–04, UI-01–04 | Not started |
| 3 — CRM Lead Management UI | SDR has full leads page: list, filter, status, notes, Realtime toast | CRM-01–05 | Not started |
| 4 — UX Fixes | Forgot password, overwrite warning, funnel validation, theme flash fixed | UX-01–04 | Not started |

## Accumulated Context

- Projeto brownfield; codebase mapeado em `.planning/codebase/` (7 documentos)
- Integração Make existente: Meta form → Sheets → email SDR
- Lead tem: nome, WhatsApp + 3 perguntas customizadas
- Webhook deve validar header `x-webhook-secret` (timing-safe compare via Node crypto)
- Dashboard atual: cliente único (291 linhas), sem testes, funções duplicadas em múltiplos componentes
- Tailwind v4 CSS-first com tokens em `app/globals.css` — sem `tailwind.config.ts`
- RLS ativo no Supabase; manter em toda nova tabela
- DONE (01-01): middleware bypass LIVE — WEBHOOK_PATHS early-return guard is FIRST code in middleware()
- DONE (01-01): service-role client in lib/supabase/service.ts — createServiceClient() uses @supabase/supabase-js
- DONE (01-01): supabase/schema.sql has full leads DDL (table, trigger, RLS, funnel view, Realtime)
- DONE (01-01): lib/types.ts exports LeadStatus, LEAD_STATUS_LABELS, Lead
- DONE (01-01): .env.local has SUPABASE_SERVICE_ROLE_KEY set; WEBHOOK_SECRET= empty (user must fill)
- PENDING (01-01 checkpoint): User must run DDL in Supabase SQL Editor + fill WEBHOOK_SECRET in .env.local + confirm curl /api/leads/ingest returns 404 (not 302)
- Phase 2: declarar autoridade de métrica (leads vs daily_entries) em PROJECT.md ANTES de escrever qualquer query do dashboard para evitar double-counting
- `SUPABASE_SERVICE_ROLE_KEY` e `WEBHOOK_SECRET` precisam ser adicionados ao Vercel antes do deploy

## Key Decisions

- Service-role client uses `createClient` from `@supabase/supabase-js` (not `@supabase/ssr`) — no cookie handling needed when RLS bypassed via service role (01-01)
- Middleware WEBHOOK_PATHS bypass placed as ABSOLUTE FIRST code in middleware() to prevent 302 redirects on unauthenticated webhook POSTs (01-01)
- No INSERT/DELETE RLS policy on leads — inserts use service-role bypass; deletes blocked by design (status archival) (01-01)
- .env.local.example force-tracked with `git add -f` to bypass `.env*` gitignore catch-all (01-01)

## Pending Decisions

- Definir as 3 perguntas customizadas do formulário Meta (nomes dos campos que chegam do Make) — necessário antes de finalizar Phase 1
- Confirmar secret do webhook com o usuário antes de configurar o Make
- Decidir se role `dona` tem acesso read-only a `/leads` ou é bloqueada no middleware
- Confirmar quando equipe para de entrar `appointments_count` manualmente no `daily_entries` (cutover de métricas)

## Blockers

- **CHECKPOINT (Task 6):** User must complete three manual steps before Plan 02 can execute:
  1. Run Phase 1 DDL block in Supabase SQL Editor (public.leads must exist with 12 columns)
  2. Fill `WEBHOOK_SECRET=` in .env.local (generate with `openssl rand -hex 32`)
  3. Confirm `curl -X POST http://localhost:3000/api/leads/ingest` returns 404 (not 302)
