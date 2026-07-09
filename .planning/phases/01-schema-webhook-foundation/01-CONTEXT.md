# Phase 1: Schema + Webhook Foundation — Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Source:** Claude's Discretion (user delegated all implementation decisions)

<domain>
## Phase Boundary

This phase delivers the complete backend infrastructure for lead ingestion:
- Supabase `leads` table with full schema (including fields for later phases)
- RLS policies scoped correctly (no anon insert, SDR/gestor update, all authenticated read)
- `lib/supabase/service.ts` — server-only service-role client
- Middleware bypass for `/api/leads/ingest`
- Webhook endpoint `app/api/leads/ingest/route.ts` with secret validation, phone normalization, idempotent upsert
- Updated `lib/types.ts` with `LeadStatus`, `LEAD_STATUS_LABELS`, `Lead`

No UI work in this phase. The `/leads` page ships in Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Middleware Bypass
- **D-01:** Use **early-return guard at top of middleware function body** (not matcher regex modification).
  ```typescript
  const WEBHOOK_PATHS = ["/api/leads/ingest"];
  // First line inside middleware():
  if (WEBHOOK_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next({ request });
  }
  ```
  Rationale: More explicit and readable than regex; WEBHOOK_PATHS array makes it easy to add future public API routes without touching the regex. Must be the FIRST thing in the function body — before the Supabase client is even created.

### Service-Role Client
- **D-02:** New file `lib/supabase/service.ts` using raw `createClient` (not `createServerClient`).
  ```typescript
  import { createClient } from "@supabase/supabase-js";
  export function createServiceClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  ```
  Never import this in client components or server components — webhook route only.

### Webhook Security
- **D-03:** Use `crypto.timingSafeEqual` for secret comparison (Node.js built-in, no new deps):
  ```typescript
  import { timingSafeEqual } from "crypto";
  const provided = Buffer.from(req.headers.get("x-webhook-secret") ?? "", "utf8");
  const expected = Buffer.from(process.env.WEBHOOK_SECRET ?? "", "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
  Never log the secret value. Log only `secret_present: true/false`.

### Error Response Codes
- **D-04:** HTTP status codes for the endpoint:
  - `401` — missing or wrong `x-webhook-secret` header
  - `400` — invalid JSON body (parse failure)
  - `422` — missing required fields (`name` or `whatsapp`) — Make does NOT retry on 4xx
  - `201` — success (lead created)
  - `200` — duplicate (same `lead_source_id`) — Make does NOT retry; idempotent
  - `500` — DB error (Make MAY retry; log but do not expose Supabase error details)

### Make Payload Mapping
- **D-05:** Accept flexible payload shape. Required fields: `name` (string) and `phone` (or `whatsapp`). Store raw payload in `raw_payload jsonb`. Store 3 custom answers in `form_answers jsonb`.
  ```typescript
  // Normalization in endpoint:
  const name = body.name ?? body.nome ?? body.lead_name;
  const phone = body.phone ?? body.whatsapp ?? body.telefone ?? body.celular;
  const formAnswers = { ...body };
  delete formAnswers.name; delete formAnswers.nome; delete formAnswers.lead_name;
  delete formAnswers.phone; delete formAnswers.whatsapp; delete formAnswers.telefone;
  // formAnswers now contains only the custom question answers
  ```
  ⚠️ **Pending configuration:** Confirm exact field names from your Make scenario before deploying. Map them explicitly in the endpoint once confirmed.

### Phone Normalization
- **D-06:** Strip all non-digit characters before storing:
  ```typescript
  function normalizePhone(raw: string): string {
    return raw.replace(/\D/g, "");
  }
  ```
  Store normalized value in `whatsapp` column. Country code (55) is preserved if sent by Make.

### Idempotency
- **D-07:** Use Supabase `upsert` with `onConflict: "lead_source_id"` and `ignoreDuplicates: true`.
  Make sends Meta's `lead_id` as the idempotency key. Field name in payload: `lead_id` (or `leadId` — normalize in endpoint).
  On duplicate: return `200` (not `201`) with `{ ok: true, duplicate: true }`.

### Supabase Schema — `leads` Table
- **D-08:** Full schema including fields for later phases (notes, status_updated_at). Schema migrations after data exists are costly — include everything now:
  ```sql
  create table if not exists public.leads (
    id               uuid primary key default gen_random_uuid(),
    lead_source_id   text unique,               -- Meta lead_id for idempotency
    name             text not null,
    whatsapp         text not null,             -- digits only, normalized at ingest
    form_answers     jsonb not null default '{}',
    raw_payload      jsonb not null default '{}', -- full Make payload for debugging
    status           text not null default 'novo'
                     check (status in (
                       'novo', 'contatado', 'agendado',
                       'compareceu', 'no_show',
                       'comprou', 'perdido', 'sem_interesse'
                     )),
    notes            text,                      -- SDR notes (Phase 3)
    status_updated_at timestamptz,              -- set when status changes (Phase 3 uses this)
    source           text not null default 'make_webhook',
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
  );
  ```
  Note: `notes text` and `status_updated_at` are included now to avoid migration later.

### RLS Policies
- **D-09:** Three policies only (no insert policy — webhook uses service role which bypasses RLS):
  ```sql
  alter table public.leads enable row level security;

  -- Read: SDR and gestor only (NOT dona — leads contain patient PII)
  create policy "leads_select_sdr_gestor"
    on public.leads for select to authenticated
    using (public.current_role() in ('sdr', 'gestor'));

  -- Update: SDR and gestor (status + notes)
  create policy "leads_update_sdr_gestor"
    on public.leads for update to authenticated
    using (public.current_role() in ('sdr', 'gestor'))
    with check (public.current_role() in ('sdr', 'gestor'));

  -- No DELETE policy — leads are archived via status, never deleted
  -- (implicit deny; comment in schema makes intent explicit)
  ```
  Rationale: `dona` is excluded from `leads_select` because the table contains patient names and phone numbers (PII/LGPD concern). Dona sees only aggregate counts on the dashboard.

### Postgres View for Dashboard
- **D-10:** Create `lead_funnel_by_status` view for Phase 2 dashboard integration. Include it in Phase 1 schema since it depends on the `leads` table:
  ```sql
  create or replace view public.lead_funnel_by_status as
  select
    status,
    count(*)::integer as lead_count
  from public.leads
  where created_at >= date_trunc('month', now())
  group by status;
  ```

### `updated_at` Trigger
- **D-11:** Reuse the trigger pattern from `daily_entries`:
  ```sql
  create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
  begin new.updated_at = now(); return new; end; $$;

  create trigger leads_updated_at
    before update on public.leads
    for each row execute function public.set_updated_at();
  ```

### Supabase Realtime
- **D-12:** Enable Realtime on `leads` in Phase 1 (needed for Phase 3 toast notification):
  ```sql
  alter publication supabase_realtime add table public.leads;
  ```
  Cost: zero in Phase 1. Removing it later is harder than adding it now.

### TypeScript Types
- **D-13:** Add to `lib/types.ts` (follow codebase convention: `type` not `interface`, `Record<K,V>` for maps):
  ```typescript
  export type LeadStatus =
    | "novo" | "contatado" | "agendado"
    | "compareceu" | "no_show"
    | "comprou" | "perdido" | "sem_interesse";

  export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
    novo: "Novo",
    contatado: "Contatado",
    agendado: "Agendado",
    compareceu: "Compareceu",
    no_show: "No-show",
    comprou: "Comprou",
    perdido: "Perdido",
    sem_interesse: "Sem interesse",
  };

  export type Lead = {
    id: string;
    lead_source_id: string | null;
    name: string;
    whatsapp: string;
    form_answers: Record<string, string>;
    raw_payload: Record<string, unknown>;
    status: LeadStatus;
    notes: string | null;
    status_updated_at: string | null;
    source: string;
    created_at: string;
    updated_at: string;
  };
  ```

### New Environment Variables
- **D-14:** Two new server-only env vars (no `NEXT_PUBLIC_` prefix):
  - `WEBHOOK_SECRET` — random 32-char hex (generate with `openssl rand -hex 32`)
  - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard → Settings → API → service_role key
  Add both to `.env.local` AND to Vercel environment variables (server-only).
  Add to `.env.local.example` with placeholder values (not the real secrets).

### Claude's Discretion
- File naming and import organization follow existing project conventions (`@/lib/supabase/service`)
- Comment style: minimal, only for non-obvious constraints (existing convention)
- Error logging: use `console.error` for server-side DB errors (consistent with existing patterns)
- `supabase/schema.sql` is append-only — add new SQL at the end of the file

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Security
- `.planning/research/ARCHITECTURE.md` — webhook route structure, middleware bypass pattern, service client design, build order
- `.planning/research/PITFALLS.md` — PITFALL-W1 through W5, PITFALL-R1 through R4 (critical pitfalls for Phase 1)
- `.planning/research/STACK.md` — service client code, RLS policy code, Realtime setup

### Existing Code to Respect
- `middleware.ts` — current matcher regex and auth flow to modify
- `supabase/schema.sql` — existing schema patterns (UUID primary keys, timestamptz, check constraints, existing trigger pattern)
- `lib/supabase/server.ts` — existing server client pattern (DO NOT reuse for webhook — for reference only)
- `lib/types.ts` — existing type conventions (`type` not `interface`, `Record<K,V>`)
- `AGENTS.md` — project-specific instructions (check before writing any code)

### Requirements
- `.planning/REQUIREMENTS.md` — INGST-01 through INGST-04 (all Phase 1 requirements)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/server.ts` — Reference for createClient pattern (DO NOT reuse directly; create separate service.ts)
- `lib/types.ts` — Append `LeadStatus`, `LEAD_STATUS_LABELS`, `Lead` types here

### Established Patterns
- All domain types use `type` (not `interface`) — follow this
- `Record<K, V>` for keyed maps
- `uuid primary key default gen_random_uuid()` for all table PKs
- `timestamptz not null default now()` for timestamps
- `check (col in (...))` for constrained string enums (see `profiles.role`)
- Supabase queries use `.single<Type>()` with explicit generic

### Integration Points
- `middleware.ts` — Add `WEBHOOK_PATHS` guard as FIRST code in the function body
- `supabase/schema.sql` — Append new DDL at end of file
- `lib/types.ts` — Append new types at end of file
- `.env.local` and `.env.local.example` — Add new env vars
- `app/api/` — No existing API routes (only `app/auth/callback/route.ts` exists at that level)

</code_context>

<specifics>
## Specific Ideas

- The webhook must return `200` (not `201`) on duplicate `lead_source_id` so Make does NOT retry
- Never expose raw Supabase error messages in HTTP responses (security leak)
- Test the endpoint with `curl` before connecting Make to production
- The middleware bypass (`WEBHOOK_PATHS`) must be committed and deployed BEFORE testing the webhook with Make

</specifics>

<deferred>
## Deferred Ideas

- Supabase Realtime subscription in UI (Phase 3)
- `lead_notes` separate table consideration (deferred — single `notes text` column is sufficient for v1.1 scope)
- Replay attack timestamp window (post v1.1 — documented in PITFALLS.md as LOW risk)
- WhatsApp deep link in lead list (Phase 3 UI work)

</deferred>

---

*Phase: 01-schema-webhook-foundation*
*Context gathered: 2026-07-09 — Claude's Discretion (user delegated all decisions)*
