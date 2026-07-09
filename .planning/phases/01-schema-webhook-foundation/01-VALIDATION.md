---
phase: 01
slug: schema-webhook-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-09
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in project (confirmed by research) |
| **Config file** | None |
| **Quick run command** | `curl` smoke tests (see below) |
| **Full suite command** | curl suite + Supabase SQL Editor queries |
| **Estimated runtime** | ~2 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Verify the specific behavior added by that task (see per-task map below)
- **After every plan wave:** Run the full curl smoke test suite
- **Before `/gsd:verify-work`:** All curl tests green + all DB queries return expected results
- **Max feedback latency:** 5 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Verification Command | Status |
|---------|------|------|-------------|-----------|---------------------|--------|
| schema | SQL | 1 | INGST-01 | DB check | `SELECT column_name FROM information_schema.columns WHERE table_name = 'leads'` | ⬜ pending |
| trigger | SQL | 1 | INGST-01 | DB check | `SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'leads'` | ⬜ pending |
| rls | SQL | 1 | INGST-01 | DB check | `SELECT policyname FROM pg_policies WHERE tablename = 'leads'` | ⬜ pending |
| view | SQL | 1 | INGST-01 | DB check | `SELECT * FROM public.lead_funnel_by_status` | ⬜ pending |
| types | tsc | 1 | INGST-01 | Build | `npx tsc --noEmit` — must exit 0 | ⬜ pending |
| service-client | code | 1 | INGST-01 | Code review | `lib/supabase/service.ts` exists, imports `createClient` from `@supabase/supabase-js` | ⬜ pending |
| middleware | curl | 1 | INGST-01 | Smoke | `curl -v POST /api/leads/ingest -H "x-webhook-secret: wrong"` → HTTP 401 (not 302) | ⬜ pending |
| webhook | curl | 2 | INGST-01 | Smoke | `curl POST /api/leads/ingest` with valid secret + payload → HTTP 201 | ⬜ pending |
| idempotency | curl | 2 | INGST-02 | Smoke | Same payload twice → second returns HTTP 200 `{"duplicate":true}` | ⬜ pending |
| phone-norm | SQL | 2 | INGST-03 | DB check | `SELECT whatsapp FROM leads WHERE lead_source_id = 'meta_123'` → digits only | ⬜ pending |
| form-answers | SQL | 2 | INGST-04 | DB check | `SELECT form_answers FROM leads WHERE lead_source_id = 'meta_123'` → no name/phone fields | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test framework to install. All validation is via curl + SQL queries. No Wave 0 setup needed.

*Existing infrastructure covers all phase requirements via curl smoke tests and Supabase SQL Editor.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Middleware bypass blocks 302 redirect | INGST-01 | No test framework; curl -v reveals redirect vs 401 | `curl -v -X POST http://localhost:3000/api/leads/ingest -H "x-webhook-secret: wrong" -H "Content-Type: application/json" -d '{}'` — look for `HTTP/1.1 401` not `HTTP/1.1 302` |
| Lead appears in Supabase table | INGST-01 | DB write verification; curl response alone insufficient | After HTTP 201, run `SELECT * FROM public.leads ORDER BY created_at DESC LIMIT 1` in Supabase SQL Editor |
| Phone digits-only | INGST-03 | DB state check; not verifiable from curl response alone | `SELECT whatsapp FROM public.leads WHERE lead_source_id = 'meta_123'` — must be `5511999991234` not `+55 (11) 99999-1234` |
| form_answers excludes standard fields | INGST-04 | DB state check | `SELECT form_answers FROM public.leads WHERE lead_source_id = 'meta_123'` — must contain custom fields only (e.g., `{"objetivo": "Emagrecer"}`), NOT name/whatsapp/lead_id |
| RLS blocks anon reads | INGST-01 | Requires testing from anon Supabase client | In Supabase SQL Editor, run `SELECT count(*) FROM public.leads` with anon key — must return error or 0 rows |

---

## Curl Smoke Test Suite

Run these after deployment (local: `npm run dev`). Set env vars first:

```bash
BASE_URL="http://localhost:3000"
SECRET="your-webhook-secret-from-env-local"

# Test 1: Valid request — expect 201
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{"name":"Maria Silva","whatsapp":"+55 (11) 99999-1234","lead_id":"meta_123","objetivo":"Emagrecer"}'
# Expected: HTTP 201

# Test 2: Duplicate — expect 200
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{"name":"Maria Silva","whatsapp":"+55 (11) 99999-1234","lead_id":"meta_123","objetivo":"Emagrecer"}'
# Expected: HTTP 200, body includes "duplicate":true

# Test 3: Wrong secret — expect 401
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: wrong_secret" \
  -d '{"name":"Test","whatsapp":"11999999999","lead_id":"meta_456"}'
# Expected: HTTP 401

# Test 4: Missing required field — expect 422
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{"lead_id":"meta_789","objetivo":"Emagrecer"}'
# Expected: HTTP 422

# Test 5: No secret header — expect 401
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","whatsapp":"11999999999"}'
# Expected: HTTP 401
```

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions or are covered by the curl suite
- [ ] Sampling continuity: executor checks DB/curl after each wave
- [ ] No automated test framework gaps (none expected — project has no framework)
- [ ] Feedback latency < 5 minutes per wave
- [ ] `nyquist_compliant: true` set in frontmatter after plan checker approves

**Approval:** pending
