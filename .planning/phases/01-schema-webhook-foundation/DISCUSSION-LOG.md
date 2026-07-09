# Discussion Log — Phase 1: Schema + Webhook Foundation

**Date:** 2026-07-09
**Mode:** Claude's Discretion (user delegated all implementation decisions)

---

## Session

**User intent:** "Na verdade eu quero que você faça o melhor e já aplique tudo logo"

User delegated all gray area decisions to Claude. No interactive discussion required — Claude analyzed the codebase, applied established patterns, and documented all decisions in CONTEXT.md.

---

## Decisions Made

All 14 decisions (D-01 through D-14) are documented in `01-CONTEXT.md`:

- D-01: Middleware bypass via `WEBHOOK_PATHS` early-return guard
- D-02: Service-role client in `lib/supabase/service.ts`
- D-03: `crypto.timingSafeEqual` for secret comparison
- D-04: HTTP status code mapping (401/400/422/201/200/500)
- D-05: Flexible payload mapping with `raw_payload` and `form_answers` JSONB
- D-06: Phone normalization — strip non-digits, preserve country code
- D-07: Idempotency via `upsert` on `lead_source_id` with `ignoreDuplicates: true`
- D-08: Full `leads` schema including `notes` and `status_updated_at` for later phases
- D-09: RLS — SDR/gestor only; no insert policy (service role bypasses); no delete
- D-10: `lead_funnel_by_status` view included in Phase 1 schema
- D-11: `set_updated_at()` trigger reused from existing pattern
- D-12: Realtime enabled on `leads` table in Phase 1
- D-13: TypeScript types — `LeadStatus`, `LEAD_STATUS_LABELS`, `Lead`
- D-14: Two new server-only env vars — `WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`

---

## Deferred

- Exact Meta field names from Make scenario (confirm before deploying Phase 1)
- Replay attack timestamp window (post v1.1, LOW risk)
- `dona` role access to `/leads` route (decided: block via RLS; route-level middleware block deferred to Phase 3)
