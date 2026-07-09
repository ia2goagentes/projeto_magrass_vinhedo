---
phase: 01-schema-webhook-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, rls, typescript, middleware, webhook, nextjs]

# Dependency graph
requires: []
provides:
  - "public.leads table with 12 columns, RLS, trigger, funnel view, and Realtime publication"
  - "lib/types.ts exports: LeadStatus union, LEAD_STATUS_LABELS record, Lead type"
  - "lib/supabase/service.ts: createServiceClient() factory using service-role key"
  - "middleware.ts WEBHOOK_PATHS bypass guard (first code in middleware body)"
  - ".env.local.example with WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY documented"
affects: [02-webhook-ingest, 03-crm-ui, dashboard-metrics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Service-role Supabase client (createClient from @supabase/supabase-js) for RLS bypass in webhook routes"
    - "Middleware early-return bypass for unauthenticated API routes — guard must be first code before createServerClient"
    - "RLS with current_role() helper for row-level access control on leads table"
    - "Idempotent SQL via create table if not exists, create or replace, drop policy if exists"

key-files:
  created:
    - lib/supabase/service.ts
    - .env.local.example (force-tracked with git add -f due to .env* gitignore rule)
  modified:
    - supabase/schema.sql
    - lib/types.ts
    - middleware.ts

key-decisions:
  - "Use createClient from @supabase/supabase-js (not createServerClient from @supabase/ssr) for service-role webhook client — no cookie handling needed when RLS is bypassed via service role"
  - "Middleware bypass placed as ABSOLUTE FIRST code inside middleware() function — before createServerClient to prevent 302 redirect on unauthenticated webhook POSTs"
  - "No INSERT RLS policy on leads — webhook uses service-role key which bypasses RLS entirely"
  - "No DELETE policy — leads are archived via status field, never deleted"
  - ".env.local.example force-tracked with git add -f to bypass .env* gitignore catch-all rule"

patterns-established:
  - "Webhook bypass pattern: WEBHOOK_PATHS.some((p) => path.startsWith(p)) — first line in middleware()"
  - "Service-role client: import from lib/supabase/service.ts, NEVER from client components"
  - "Lead status machine: novo -> contatado -> agendado -> compareceu/no_show -> comprou/perdido/sem_interesse"

requirements-completed: [INGST-01, INGST-02, INGST-03, INGST-04]

# Metrics
duration: ~15min (code was partially pre-applied; verified, completed Task 5, committed)
completed: 2026-07-09
---

# Phase 01 Plan 01: Schema + Webhook Foundation Summary

**Supabase leads table with RLS + trigger + funnel view + Realtime, TypeScript Lead types, service-role client factory, and middleware bypass guard shipped as precondition for webhook route**

## Performance

- **Duration:** ~15 min (Tasks 1-4 were pre-applied; verified all, executed Task 5, committed)
- **Started:** 2026-07-09T19:45:00Z
- **Completed:** 2026-07-09T20:00:00Z
- **Tasks:** 5 auto tasks complete (Task 6 = checkpoint: human-verify, paused)
- **Files modified:** 5 (supabase/schema.sql, lib/types.ts, lib/supabase/service.ts, middleware.ts, .env.local.example)

## Accomplishments

- Appended idempotent leads DDL to supabase/schema.sql: table, set_updated_at trigger function, trigger, RLS (sdr+gestor select/update, no insert policy — service-role bypasses), funnel view, Realtime publication
- Exported LeadStatus union (8 statuses), LEAD_STATUS_LABELS record, and Lead type from lib/types.ts; TypeScript compiles clean (`npx tsc --noEmit` exits 0)
- Created lib/supabase/service.ts with createServiceClient() using @supabase/supabase-js (not @supabase/ssr) with persistSession:false and autoRefreshToken:false — safe for server-side RLS bypass
- Added WEBHOOK_PATHS early-return guard as the ABSOLUTE FIRST code in middleware(), before createServerClient is called — prevents 302 redirect to /login on unauthenticated webhook POSTs (critical precondition for Plan 02)
- Documented WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY in .env.local.example (force-tracked past .env* gitignore rule); .env.local has SUPABASE_SERVICE_ROLE_KEY filled and WEBHOOK_SECRET= empty awaiting user

## Task Commits

Each task was committed atomically:

1. **Task 1: Append Phase 1 DDL to supabase/schema.sql** - `a29d790` (feat)
2. **Task 2: Append Lead types to lib/types.ts** - `1179690` (feat)
3. **Task 3: Create lib/supabase/service.ts** - `fb68d42` (feat)
4. **Task 4: Add WEBHOOK_PATHS bypass to middleware.ts** - `18938fc` (feat)
5. **Task 5: Add WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY to env files** - `7612f4d` (chore)

## Files Created/Modified

- `supabase/schema.sql` — Appended Phase 1 DDL block: public.leads table (12 columns), set_updated_at() trigger function, leads_updated_at trigger, RLS enable + 2 policies, lead_funnel_by_status view, Realtime publication
- `lib/types.ts` — Appended LeadStatus union type, LEAD_STATUS_LABELS Record<LeadStatus,string>, Lead type
- `lib/supabase/service.ts` — Created: server-only service-role Supabase client factory with JSDoc security warning
- `middleware.ts` — Added WEBHOOK_PATHS const + early-return guard before createServerClient; hoisted path const to top (removed redundant second declaration)
- `.env.local.example` — Created/committed: documents NEXT_PUBLIC_* + WEBHOOK_SECRET + SUPABASE_SERVICE_ROLE_KEY

## Decisions Made

- Used `createClient` from `@supabase/supabase-js` (not `createServerClient` from `@supabase/ssr`) for the service-role client — no cookie/session handling is needed since the service-role key bypasses RLS entirely
- Middleware bypass is placed as the FIRST code inside `middleware()`, before `let response = NextResponse.next()` and before `createServerClient()` — this is the critical ordering that prevents Make from receiving 302 redirects silently
- No INSERT or DELETE RLS policy on public.leads — inserts go via service-role (bypass), deletes are not permitted (status archival pattern only)
- `.env.local.example` was force-tracked with `git add -f` because `.gitignore` has a `.env*` catch-all; only the example file is in git

## Deviations from Plan

None - plan executed exactly as written. Tasks 1-4 were pre-applied from a prior session; verified all acceptance criteria and ran all automated verifications before accepting. Task 5 executed fresh in this session.

## Issues Encountered

- `.env.local.example` was gitignored by the `.env*` catch-all rule in `.gitignore`. Resolved by committing with `git add -f` (force flag). This is the correct approach — example files should be tracked so onboarding developers know what env vars are required.

## User Setup Required

Two steps are required before Plan 02 curl tests will succeed:

**STEP A — Run the DDL in Supabase SQL Editor (Claude cannot do this — requires dashboard credentials):**

1. Open https://supabase.com/dashboard and select your project
2. Left sidebar -> SQL Editor -> New Query
3. Open `supabase/schema.sql`, copy the block starting with `-- Phase 1: Lead Ingestion (v1.1)` through the final `alter publication ...` line
4. Paste and click Run
5. Verify with:
   ```sql
   SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='leads' ORDER BY ordinal_position;
   ```
   Must return 12 rows: id, lead_source_id, name, whatsapp, form_answers, raw_payload, status, notes, status_updated_at, source, created_at, updated_at

**STEP B — Set env vars in .env.local:**

1. Generate WEBHOOK_SECRET:
   ```
   openssl rand -hex 32
   ```
   (Windows PowerShell without openssl: `-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })`)
2. Paste into `.env.local` as `WEBHOOK_SECRET=<value>`
3. `SUPABASE_SERVICE_ROLE_KEY` is already in `.env.local` — verify it matches Supabase Dashboard -> Project Settings -> API -> service_role key
4. Restart `npm run dev`

**STEP C — Verify middleware bypass:**
```
curl -v -X POST http://localhost:3000/api/leads/ingest \
  -H "x-webhook-secret: wrong" \
  -H "Content-Type: application/json" \
  -d "{}"
```
Expected: `HTTP/1.1 404 Not Found` (not 302)

## Known Stubs

None — no placeholder data or stub components in this plan. All code is wiring (schema DDL, types, client factory, middleware guard).

## Next Phase Readiness

- Plan 02 (webhook route `/api/leads/ingest`) is UNBLOCKED as soon as the user completes STEP A (DDL) and STEP B (env vars) and STEP C (curl returns 404)
- `createServiceClient()` is ready to import from `@/lib/supabase/service`
- `LeadStatus`, `LEAD_STATUS_LABELS`, `Lead` are ready to import from `@/lib/types`
- The middleware bypass guard is live in production after next deploy

---
*Phase: 01-schema-webhook-foundation*
*Completed: 2026-07-09*
