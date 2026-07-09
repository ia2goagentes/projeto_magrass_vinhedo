# Phase 1: Schema + Webhook Foundation — Research

**Researched:** 2026-07-09
**Domain:** Next.js 16 Route Handlers, Supabase RLS + upsert, Node.js crypto
**Confidence:** HIGH — all critical findings verified against locally installed source files

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Middleware bypass: early-return guard at TOP of middleware function body using `WEBHOOK_PATHS` array. Not regex modification.
- **D-02:** Service-role client in new file `lib/supabase/service.ts` using raw `createClient` from `@supabase/supabase-js`. Never `createServerClient`.
- **D-03:** Webhook secret validation using `crypto.timingSafeEqual` (Node.js built-in). Never log secret value.
- **D-04:** HTTP codes: 401 (bad secret), 400 (bad JSON), 422 (missing required fields), 201 (created), 200 (duplicate), 500 (DB error).
- **D-05:** Accept flexible payload — normalize `name`/`phone` field aliases. Store raw payload in `raw_payload jsonb`, custom answers in `form_answers jsonb`.
- **D-06:** Phone normalization: `raw.replace(/\D/g, "")` — digits only, preserve country code if sent.
- **D-07:** Idempotency via `upsert({ onConflict: "lead_source_id", ignoreDuplicates: true })`. Return 200 (not 201) on duplicate.
- **D-08:** Full `leads` table DDL including `notes`, `status_updated_at`, `raw_payload`, `lead_source_id text unique`, `source text` — all now to avoid future migrations.
- **D-09:** Three RLS policies only (select + update for sdr/gestor; no insert policy — service role bypasses RLS). `dona` excluded from leads_select (PII/LGPD).
- **D-10:** Create `lead_funnel_by_status` view in Phase 1 (depends on leads table).
- **D-11:** Create `set_updated_at()` trigger function + `leads_updated_at` trigger.
- **D-12:** Enable Realtime: `alter publication supabase_realtime add table public.leads;`
- **D-13:** Add to `lib/types.ts`: `LeadStatus` union, `LEAD_STATUS_LABELS` record, `Lead` type. Use `type` not `interface`, `Record<K,V>` for maps.
- **D-14:** Two new env vars: `WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` (never `NEXT_PUBLIC_` prefix). Add to `.env.local`, Vercel, and `.env.local.example`.

### Claude's Discretion

- File naming and import organization follow existing project conventions (`@/lib/supabase/service`)
- Comment style: minimal, only for non-obvious constraints
- Error logging: use `console.error` for server-side DB errors
- `supabase/schema.sql` is append-only — add new SQL at end of file

### Deferred Ideas (OUT OF SCOPE)

- Supabase Realtime subscription in UI (Phase 3)
- `lead_notes` separate table (deferred — single `notes text` column sufficient)
- Replay attack timestamp window (post v1.1 — LOW risk per PITFALLS.md)
- WhatsApp deep link in lead list (Phase 3 UI work)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INGST-01 | Sistema aceita POST no endpoint `/api/leads/ingest` com header `x-webhook-secret` e insere lead na tabela `leads` (inclui middleware bypass e service-role client) | Verified: Next.js 16 Route Handler pattern for POST confirmed; middleware bypass pattern confirmed; service-role client pattern confirmed |
| INGST-02 | Lead duplicado (mesmo `lead_source_id` do Meta) é silenciosamente ignorado — Make pode fazer retry sem criar duplicatas | Verified: `upsert({ onConflict: "lead_source_id", ignoreDuplicates: true })` is the correct API in @supabase/postgrest-js 2.110.1 |
| INGST-03 | Número de WhatsApp é normalizado para apenas dígitos no momento da ingestão | Verified: `raw.replace(/\D/g, "")` pattern — pure JS, no deps; confirmed in PITFALLS.md |
| INGST-04 | Respostas do formulário Meta são armazenadas como JSONB sem colunas fixas por pergunta | Verified: `form_answers jsonb not null default '{}'` + `raw_payload jsonb` — confirmed in schema DDL decisions |
</phase_requirements>

---

## Summary

Phase 1 is a pure backend phase: schema DDL, a service-role Supabase client, middleware modification, and one POST endpoint. Zero new npm dependencies are required — everything is available in the installed packages (Next.js 16.2.10, @supabase/supabase-js 2.110.1, Node.js built-in `crypto`).

The research confirmed all six critical technical questions raised in the brief. The most important findings are: (1) `Response.json()` static method works in Next.js 16 Route Handlers without importing `NextResponse` — verified against locally installed Next.js 16 docs; (2) `crypto.timingSafeEqual` is available only in the **Node.js runtime** (not Edge runtime) — Route Handlers default to Node.js so no explicit `export const runtime = 'nodejs'` is required, but it should be added as defensive documentation; (3) the existing `schema.sql` has NO `set_updated_at()` function yet — it must be created fresh, not reused.

The middleware `config.matcher` regex does NOT exclude `/api/` routes. Without the early-return guard, a POST from Make to `/api/leads/ingest` will hit the middleware, call `supabase.auth.getUser()` which returns null, and redirect to `/login` with a 302 — Make will silently swallow the lead. The middleware bypass MUST be the first commit of this phase.

**Primary recommendation:** Build in strict order: schema DDL → types → service client → middleware bypass (commit + deploy) → webhook route. Test with `curl` before connecting Make.

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

AGENTS.md states: "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

Directives verified and applied:
- Route Handler exports: confirmed `export async function POST(request: Request)` is correct (no default export pattern)
- `Response.json()` static method: confirmed available in Next.js 16 Route Handlers (verified in official docs at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`)
- `params` in dynamic routes: in Next.js 15+, `params` is a Promise — but this phase has no dynamic routes, so not relevant here
- Runtime defaults to Node.js for Route Handlers — confirmed (Edge runtime is only for Proxy/middleware in this version)

---

## Research Priority Findings

### RP-1: Next.js 16 Route Handler API

**Confidence:** HIGH — verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`

Route Handlers use named exports (no default export):

```typescript
// app/api/leads/ingest/route.ts
export async function POST(request: Request) {
  // Web API Request — no bodyParser needed
  const body = await request.json()
  return Response.json({ ok: true }, { status: 201 })
}
```

Key facts:
- `export async function POST(request: Request)` — correct signature for this phase
- `request.json()` is the Web API method — no bodyParser needed
- `Response.json(data, { status: N })` is the correct response pattern — it is the **static method** on the Web `Response` class, not `NextResponse.json()`
- Both `Response.json()` and `new Response()` are valid — see confirmed example in docs: `return Response.json({ message: 'Hello World' })`
- `NextResponse.json()` would also work (it wraps `Response`), but plain `Response.json()` is what the official docs show for Route Handlers and is preferred here for consistency with the docs

**Gotcha:** The parameter type annotation can be `Request` (Web API) or `NextRequest` (Next.js extension). For this webhook, `Request` is sufficient — we only need `request.headers.get()` and `request.json()`, both available on Web `Request`. Using `NextRequest` is also fine if the developer prefers the extra methods. Either works.

### RP-2: Import for Service-Role Client

**Confidence:** HIGH — verified against installed package

The service client must use `createClient` from `@supabase/supabase-js` (bare client), NOT `createServerClient` from `@supabase/ssr`. These are different:

| Import | From | What it does |
|--------|------|--------------|
| `createClient` | `@supabase/supabase-js` | Pure JS client; no cookies; service-role key bypasses RLS entirely |
| `createServerClient` | `@supabase/ssr` | Cookie-based auth; reads user session from request cookies; for authenticated routes |

The webhook route is not called by an authenticated user. Using `createServerClient` would still work but would unnecessarily attempt cookie-based auth and return a null session. Using the service-role key with `createClient` is the correct and canonical pattern.

```typescript
// lib/supabase/service.ts — confirmed correct
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

Note: STACK.md shows an optional `{ auth: { persistSession: false } }` option — this is harmless to add for clarity but not strictly required since the service-role client does not use sessions.

**File name decision:** CONTEXT.md D-02 specifies `lib/supabase/service.ts`. STACK.md earlier draft used `lib/supabase/admin.ts`. Use `lib/supabase/service.ts` per the locked decision.

### RP-3: `crypto.timingSafeEqual` Runtime Availability

**Confidence:** HIGH — verified against Next.js 16 docs and Node.js built-in

`crypto.timingSafeEqual` is a **Node.js built-in**. It is available in the Node.js runtime but NOT in the Edge runtime.

Next.js 16 Route Handlers run in the **Node.js runtime by default** (the Edge runtime is only used when explicitly opted in via `export const runtime = 'edge'` or when the file is in the `proxy.ts` special file). This phase uses neither.

**Recommendation:** Add `export const runtime = 'nodejs'` as the first export in `app/api/leads/ingest/route.ts` as defensive documentation. This is not strictly required but makes the runtime dependency explicit and prevents accidental Edge deployment.

```typescript
// app/api/leads/ingest/route.ts
export const runtime = 'nodejs'; // Required: timingSafeEqual is Node-only

import { timingSafeEqual } from "crypto";
```

**The Edge runtime's Crypto section** (verified in `07-edge.md`) only lists Web Crypto (`crypto` global, `CryptoKey`, `SubtleCrypto`) — NOT Node.js `crypto` module. `timingSafeEqual` is not in the Web Crypto standard and would throw `ReferenceError` in Edge runtime.

### RP-4: `Response.json()` vs `NextResponse.json()`

**Confidence:** HIGH — confirmed in official docs at route.md

Both work in Next.js 16. The official docs example for Route Handlers uses `Response.json()`:

```typescript
export async function GET() {
  return Response.json({ message: 'Hello World' })
}
```

`NextResponse.json()` is functionally equivalent (NextResponse extends Response) but requires importing from `next/server`. For this webhook route, use `Response.json()` — it requires no import and matches the official docs pattern.

**One exception:** If you need to set additional Next.js-specific headers or use Next.js redirect methods, use `NextResponse`. For this simple JSON webhook, `Response.json()` is cleaner.

### RP-5: Supabase Upsert API — Exact Syntax

**Confidence:** HIGH — verified against source at `node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts`

The correct upsert call for idempotent lead insertion is:

```typescript
const { error } = await supabase
  .from("leads")
  .upsert(
    { ...payload },
    { onConflict: "lead_source_id", ignoreDuplicates: true }
  );
```

Verified type signature (line 1371–1380 of PostgrestQueryBuilder.ts):
```typescript
upsert(values, {
  onConflict?: string,        // column name(s), comma-separated for multiple
  ignoreDuplicates?: boolean, // default false — TRUE means DO NOTHING on conflict
  count?: 'exact' | 'planned' | 'estimated',
  defaultToNull?: boolean,    // default true
})
```

When `ignoreDuplicates: true`, the library sends `Prefer: resolution=ignore-duplicates` header to PostgREST. PostgREST translates this to `ON CONFLICT DO NOTHING`.

**Critical:** When `ignoreDuplicates: true` and a conflict occurs:
- `data` will be an empty array (`[]`)
- `error` will be `null` — there is NO error on duplicate

This means to detect a duplicate (to return 200 instead of 201), check if the returned data is empty:

```typescript
const { data, error } = await supabase
  .from("leads")
  .upsert(
    { ...payload },
    { onConflict: "lead_source_id", ignoreDuplicates: true }
  )
  .select("id");

if (error) {
  console.error("DB insert error", { code: error.code });
  return Response.json({ error: "DB error" }, { status: 500 });
}

const isDuplicate = data === null || data.length === 0;
if (isDuplicate) {
  return Response.json({ ok: true, duplicate: true }, { status: 200 });
}
return Response.json({ ok: true, id: data[0].id }, { status: 201 });
```

### RP-6: Middleware `config.matcher` and Early-Return Guard

**Confidence:** HIGH — verified by reading actual `middleware.ts`

The current `config.matcher`:
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

This matcher DOES match `/api/leads/ingest`. The regex only excludes static assets. An unauthenticated POST to `/api/leads/ingest` will reach the middleware and execute the auth check.

The middleware currently does:
1. Creates `createServerClient` — this reads cookies and calls Supabase
2. Calls `supabase.auth.getUser()` — returns `{ user: null }` for requests without session cookies
3. Checks `if (!user)` → since user is null → redirects to `/login` → returns 302

A 302 redirect with HTML body is what Make receives when the bypass is missing.

**The early-return guard (D-01) must be added as the FIRST code inside the middleware function body**, before the `createServerClient` call:

```typescript
export async function middleware(request: NextRequest) {
  // MUST be first — before createServerClient is ever called
  const WEBHOOK_PATHS = ["/api/leads/ingest"];
  const path = request.nextUrl.pathname;
  if (WEBHOOK_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // ... rest of existing middleware unchanged ...
  let response = NextResponse.next({ request });
  const supabase = createServerClient(...)
  // etc.
```

**Do NOT modify `config.matcher`** — D-01 locks the early-return approach. The WEBHOOK_PATHS array makes future public API routes easy to add.

### RP-7: Supabase Realtime DDL Syntax

**Confidence:** HIGH — confirmed in STACK.md and ARCHITECTURE.md, consistent with Supabase documentation patterns

```sql
alter publication supabase_realtime add table public.leads;
```

This is the correct syntax for enabling Supabase Realtime on a table. It adds the table to the `supabase_realtime` PostgreSQL publication. This must run after the `leads` table is created.

### RP-8: `set_updated_at()` Function Status in Existing Schema

**Confidence:** HIGH — verified by reading `supabase/schema.sql`

**Critical finding:** The existing `schema.sql` does NOT have a `set_updated_at()` trigger function. The `daily_entries`, `weekly_ad_metrics`, and `goals` tables all have `updated_at timestamptz not null default now()` columns but there are NO triggers keeping them updated — they're only set at INSERT time, not on UPDATE.

This means:
- The `set_updated_at()` function referenced in D-11 must be CREATED from scratch (it does not exist yet)
- The function name in CONTEXT.md D-11 (`set_updated_at`) and STACK.md (`update_updated_at`) differ — use D-11's name `set_updated_at` per locked decisions
- Use `create or replace function` so the SQL is idempotent

The DDL to append to `supabase/schema.sql`:
```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
```

---

## Standard Stack

### Core (all already installed — zero new npm installs)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `next` | 16.2.10 | Route Handler runtime, middleware | `package.json` |
| `@supabase/supabase-js` | 2.110.1 | Service-role DB client, upsert API | `package.json` |
| `@supabase/ssr` | 0.12.0 | Already used in middleware (no changes) | `package.json` |
| `crypto` (built-in) | Node.js built-in | `timingSafeEqual` for secret comparison | Node.js |

### No New Dependencies

Zero new npm packages. Confirmed by SUMMARY.md, STACK.md, and package.json inspection.

---

## Architecture Patterns

### Recommended File Structure for Phase 1

```
lib/
└── supabase/
    ├── server.ts          # existing — DO NOT modify
    └── service.ts         # NEW — service-role client (webhook only)

lib/
└── types.ts               # APPEND LeadStatus, LEAD_STATUS_LABELS, Lead

app/
└── api/
    └── leads/
        └── ingest/
            └── route.ts   # NEW — webhook endpoint

middleware.ts               # MODIFY — add WEBHOOK_PATHS early-return guard

supabase/
└── schema.sql              # APPEND — leads DDL, trigger, RLS, view, Realtime

.env.local                  # APPEND — WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
.env.local.example          # APPEND — same keys with placeholder values
```

### Pattern: Next.js 16 Route Handler (POST)

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
export const runtime = 'nodejs'; // explicit — timingSafeEqual requires Node.js

export async function POST(request: Request) {
  // 1. Secret validation
  // 2. JSON parse
  // 3. Field validation
  // 4. DB upsert
  // 5. Return appropriate status code
}
```

### Pattern: Middleware Early-Return

The middleware.ts early-return must be:
- First code inside the `middleware()` function body
- Before `let response = NextResponse.next({ request })`
- Before `const supabase = createServerClient(...)`

Violating this order (placing it after the supabase client creation) wastes a Supabase roundtrip and risks the guard not working if supabase client creation throws.

### Pattern: Service-Role Client (Webhook Use Only)

```typescript
// lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

NEVER import this from:
- Client components (the service role key must never reach the browser)
- Server components (use `createClient` from `lib/supabase/server.ts` instead)
- Middleware (middleware already uses createServerClient)

### Pattern: Idempotent Upsert with Duplicate Detection

```typescript
const { data, error } = await createServiceClient()
  .from("leads")
  .upsert(
    {
      lead_source_id: leadSourceId,
      name,
      whatsapp: normalizePhone(phone),
      form_answers: formAnswers,
      raw_payload: body,
      status: "novo",
      source: "make_webhook",
    },
    { onConflict: "lead_source_id", ignoreDuplicates: true }
  )
  .select("id");

if (error) {
  console.error("Lead insert error", { code: error.code, message: error.message });
  return Response.json({ error: "DB error" }, { status: 500 });
}

// ignoreDuplicates: true → empty array on conflict, null error
const isDuplicate = !data || data.length === 0;
```

### Pattern: Schema SQL Append Structure

The schema SQL additions must be ordered correctly (dependencies first):

```sql
-- 1. Table (must exist before trigger, RLS, Realtime, view reference it)
create table if not exists public.leads (...);

-- 2. Trigger function (no deps)
create or replace function public.set_updated_at() ...;

-- 3. Trigger (depends on table + function)
create trigger leads_updated_at ...;

-- 4. RLS enable + policies (depends on table)
alter table public.leads enable row level security;
create policy "leads_select_sdr_gestor" ...;
create policy "leads_update_sdr_gestor" ...;

-- 5. View (depends on table)
create or replace view public.lead_funnel_by_status as ...;

-- 6. Realtime (depends on table)
alter publication supabase_realtime add table public.leads;
```

### Anti-Patterns to Avoid

- **Using `createServerClient` in the webhook:** Would call `getUser()` which returns null → the service-role write would still work if RLS is bypassed, but the code would be misleading and waste a Supabase auth roundtrip.
- **Importing service.ts from client components:** The `SUPABASE_SERVICE_ROLE_KEY` would be bundled into the client JS — catastrophic security failure.
- **Checking `error?.code === 'DUPLICATE'` for conflict detection:** Supabase does NOT return an error when `ignoreDuplicates: true` and a conflict occurs. Check for empty `data` instead.
- **Placing middleware bypass AFTER the supabase client creation:** The bypass guard must be the very first thing in the function body.
- **Using `NextResponse.json()` when `Response.json()` works:** Fine to use either, but `Response.json()` requires no import and matches the official docs style.
- **Adding `NEXT_PUBLIC_` prefix to `SUPABASE_SERVICE_ROLE_KEY` or `WEBHOOK_SECRET`:** These must never be exposed to the browser.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timing-safe string comparison | Custom character-by-character loop | `timingSafeEqual` from `crypto` | Hand-rolled comparisons leak timing information; Node built-in is standard |
| Upsert with conflict resolution | Custom SELECT + INSERT/UPDATE logic | `.upsert({ onConflict, ignoreDuplicates: true })` | Race conditions between SELECT and INSERT; upsert is atomic |
| JSON response helpers | Custom `new Response(JSON.stringify(...), { headers: { 'Content-Type': ... }})` | `Response.json()` static method | Sets Content-Type automatically, handles serialization |
| Phone digit stripping | Custom digit extraction | `raw.replace(/\D/g, "")` | Single regex is sufficient; no edge cases for Brazilian numbers |

---

## Common Pitfalls

### Pitfall 1: Middleware Not Bypassed Before Supabase Client Creation

**What goes wrong:** If the early-return guard is placed after `let response = NextResponse.next({ request })` or after `const supabase = createServerClient(...)`, the Supabase client is still created and the auth check still runs for webhook requests. The guard MUST be the first thing in the function body.

**Why it happens:** Developers sometimes think the early return just needs to be "before the redirect logic" rather than before the supabase client creation.

**How to avoid:** The guard uses `request.nextUrl.pathname` which is available immediately on `request`. Place it before any `let` or `const` declarations.

**Warning signs:** Make is returning 302 or HTML responses instead of 201/200.

### Pitfall 2: Duplicate Returns No Error — Empty Array Signals Conflict

**What goes wrong:** Developer checks `if (error)` to detect duplicates, finds no error on conflict, and always returns 201 even for duplicates.

**Why it happens:** `ignoreDuplicates: true` translates to `ON CONFLICT DO NOTHING` which is a successful operation in PostgreSQL. No error is raised.

**How to avoid:** After upsert, chain `.select("id")` and check `data.length === 0` to detect a duplicate.

**Warning signs:** Duplicate leads in the database, or all responses returning 201 including re-sent payloads.

### Pitfall 3: `timingSafeEqual` Requires Same-Length Buffers

**What goes wrong:** `timingSafeEqual(a, b)` throws `TypeError: Input buffers must have the same byte length` if the provided secret has a different length than the expected secret.

**Why it happens:** Node.js `timingSafeEqual` requires both buffers to be the same length to prevent length-based timing attacks. If lengths differ, you must short-circuit before calling it.

**How to avoid:** Check `provided.length !== expected.length` FIRST, before calling `timingSafeEqual`:

```typescript
const provided = Buffer.from(request.headers.get("x-webhook-secret") ?? "", "utf8");
const expected = Buffer.from(process.env.WEBHOOK_SECRET ?? "", "utf8");
if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Warning signs:** Runtime TypeError crashing the endpoint for requests with wrong-length secrets.

### Pitfall 4: `SUPABASE_SERVICE_ROLE_KEY` Not Set in Vercel

**What goes wrong:** Webhook returns 500 because `process.env.SUPABASE_SERVICE_ROLE_KEY` is undefined in production. The `createClient` call uses `undefined!` which either throws or creates an invalid client.

**Why it happens:** The variable is server-only (no `NEXT_PUBLIC_` prefix) and must be explicitly added to Vercel → Settings → Environment Variables. It's not in `.env.local.example` yet (the existing example only has the two anon keys).

**How to avoid:** Add to `.env.local.example` immediately when adding to `.env.local`. Add to Vercel BEFORE deploying the webhook route.

**Warning signs:** 500 responses in production but 201 in local development.

### Pitfall 5: `set_updated_at()` Function Does Not Exist Yet

**What goes wrong:** The trigger DDL references `public.set_updated_at()` which has not been created. If the trigger CREATE runs before the function, it fails with `ERROR: function public.set_updated_at() does not exist`.

**Why it happens:** The function is new — not in the existing schema. The existing tables (`daily_entries` etc.) do NOT have this trigger function even though they have `updated_at` columns.

**How to avoid:** In the SQL to append to `schema.sql`, create the function BEFORE the trigger that references it. Use `create or replace function` for idempotency.

### Pitfall 6: Service-Role Client Missing `{ auth: { persistSession: false } }` on Some Runtimes

**What goes wrong:** In some configurations, the Supabase client tries to access localStorage/sessionStorage for session persistence, which throws in server-side Node.js context.

**Why it happens:** The `@supabase/supabase-js` client's auth module attempts to persist sessions by default.

**How to avoid:** Add `{ auth: { persistSession: false, autoRefreshToken: false } }` to the service client constructor options. This is defensive and has no downside for a server-only client.

```typescript
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
```

---

## Code Examples

### Complete `app/api/leads/ingest/route.ts`

```typescript
// Source: Next.js 16 docs (route.md) + @supabase/postgrest-js source (PostgrestQueryBuilder.ts)
// + CONTEXT.md decisions D-03 through D-07

export const runtime = 'nodejs'; // timingSafeEqual requires Node.js runtime

import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function POST(request: Request) {
  // D-03: Timing-safe secret comparison
  const provided = Buffer.from(request.headers.get("x-webhook-secret") ?? "", "utf8");
  const expected = Buffer.from(process.env.WEBHOOK_SECRET ?? "", "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // D-04: Parse JSON body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // D-05: Normalize field aliases
  const name = (body.name ?? body.nome ?? body.lead_name) as string | undefined;
  const phone = (body.phone ?? body.whatsapp ?? body.telefone ?? body.celular) as string | undefined;
  const leadSourceId = (body.lead_id ?? body.leadId) as string | undefined;

  // D-04: 422 for missing required fields (Make does NOT retry on 4xx)
  if (!name || !phone) {
    return Response.json({ error: "Missing required fields: name, phone" }, { status: 422 });
  }

  // D-05: Build form_answers (everything that isn't a known standard field)
  const STANDARD_FIELDS = new Set([
    "name", "nome", "lead_name",
    "phone", "whatsapp", "telefone", "celular",
    "lead_id", "leadId",
  ]);
  const formAnswers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!STANDARD_FIELDS.has(k)) formAnswers[k] = v;
  }

  const supabase = createServiceClient();

  // D-07: Upsert with idempotency key
  const { data, error } = await supabase
    .from("leads")
    .upsert(
      {
        lead_source_id: leadSourceId ?? null,
        name,
        whatsapp: normalizePhone(phone),
        form_answers: formAnswers,
        raw_payload: body,
        status: "novo",
        source: "make_webhook",
      },
      { onConflict: "lead_source_id", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    // D-04: 500 for DB errors; never expose Supabase error details
    console.error("Lead insert error", { code: error.code });
    return Response.json({ error: "DB error" }, { status: 500 });
  }

  // ignoreDuplicates: true → empty array when conflict, no error
  const isDuplicate = !data || data.length === 0;
  if (isDuplicate) {
    return Response.json({ ok: true, duplicate: true }, { status: 200 });
  }

  return Response.json({ ok: true, id: data[0].id }, { status: 201 });
}
```

### Complete `lib/supabase/service.ts`

```typescript
// Source: CONTEXT.md D-02
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
```

### Middleware Modification (relevant section)

```typescript
// Source: CONTEXT.md D-01 + current middleware.ts reading
// middleware.ts — add THESE lines as the very first code in the function body

const WEBHOOK_PATHS = ["/api/leads/ingest"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // WEBHOOK_PATHS early-return — MUST be first, before supabase client creation
  if (WEBHOOK_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // ... rest of existing middleware unchanged (let response = NextResponse.next...) ...
}
```

### SQL to Append to `supabase/schema.sql`

```sql
-- ---------------------------------------------------------------------------
-- Phase 1: Lead Ingestion (v1.1)
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_source_id    text unique,                   -- Meta lead_id for idempotency (nullable)
  name              text not null,
  whatsapp          text not null,                 -- digits only, normalized at ingest
  form_answers      jsonb not null default '{}',   -- custom form question answers
  raw_payload       jsonb not null default '{}',   -- full Make payload for debugging
  status            text not null default 'novo'
                    check (status in (
                      'novo', 'contatado', 'agendado',
                      'compareceu', 'no_show',
                      'comprou', 'perdido', 'sem_interesse'
                    )),
  notes             text,                          -- SDR notes (Phase 3)
  status_updated_at timestamptz,                   -- set when status changes (Phase 3)
  source            text not null default 'make_webhook',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- set_updated_at trigger function (new — does not exist in schema yet)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

-- D-09: sdr and gestor only — dona excluded (PII/LGPD)
drop policy if exists "leads_select_sdr_gestor" on public.leads;
create policy "leads_select_sdr_gestor"
  on public.leads for select to authenticated
  using (public.current_role() in ('sdr', 'gestor'));

drop policy if exists "leads_update_sdr_gestor" on public.leads;
create policy "leads_update_sdr_gestor"
  on public.leads for update to authenticated
  using (public.current_role() in ('sdr', 'gestor'))
  with check (public.current_role() in ('sdr', 'gestor'));

-- No INSERT policy — webhook uses service-role key (RLS bypass).
-- No DELETE policy — leads are archived via status, never deleted.

-- D-10: Funnel view for Phase 2 dashboard
create or replace view public.lead_funnel_by_status as
select
  status,
  count(*)::integer as lead_count
from public.leads
where created_at >= date_trunc('month', now())
group by status;

-- D-12: Enable Realtime for Phase 3 toast notifications
alter publication supabase_realtime add table public.leads;
```

### TypeScript additions for `lib/types.ts`

```typescript
// Source: CONTEXT.md D-13 — append at end of file
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

---

## Validation Architecture

This phase has no test framework and no automated test infrastructure exists in the project (no `package.json` test scripts, no test directories confirmed). Validation is entirely via `curl` smoke tests and Supabase SQL Editor queries.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — manual curl + Supabase SQL Editor |
| Config file | None |
| Quick run command | See curl commands below |
| Full validation | curl suite + SQL checks below |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Test Exists? |
|--------|----------|-----------|-------------------|-------------|
| INGST-01 | POST to `/api/leads/ingest` with correct secret creates lead | Smoke (curl) | See curl suite below | No test file — curl only |
| INGST-01 | POST without secret returns 401 | Smoke (curl) | See curl suite below | No test file — curl only |
| INGST-02 | Second POST with same `lead_id` returns 200 with `duplicate: true` | Smoke (curl) | See curl suite below | No test file — curl only |
| INGST-03 | Lead in DB has `whatsapp` with only digits | DB query | SQL query below | No test file — DB check |
| INGST-04 | Lead in DB has non-standard fields in `form_answers` jsonb | DB query | SQL query below | No test file — DB check |

### Curl Smoke Test Suite

Run these in order after local deployment (`npm run dev`). The middleware bypass must be deployed first.

```bash
# Set variables
BASE_URL="http://localhost:3000"
SECRET="your-webhook-secret-from-env-local"

# Test 1: Valid request — expect 201
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{"name":"Maria Silva","whatsapp":"+55 (11) 99999-1234","lead_id":"meta_123","objetivo":"Emagrecer"}'

# Expected: HTTP 201, body: {"ok":true,"id":"<uuid>"}

# Test 2: Duplicate — expect 200 (same lead_id)
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{"name":"Maria Silva","whatsapp":"+55 (11) 99999-1234","lead_id":"meta_123","objetivo":"Emagrecer"}'

# Expected: HTTP 200, body: {"ok":true,"duplicate":true}

# Test 3: Wrong secret — expect 401
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: wrong_secret" \
  -d '{"name":"Test","whatsapp":"11999999999","lead_id":"meta_456"}'

# Expected: HTTP 401, body: {"error":"Unauthorized"}

# Test 4: Missing required field — expect 422
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $SECRET" \
  -d '{"lead_id":"meta_789","objetivo":"Emagrecer"}'

# Expected: HTTP 422, body: {"error":"Missing required fields: name, phone"}

# Test 5: No secret header — expect 401
curl -s -w "\nHTTP %{http_code}\n" \
  -X POST "$BASE_URL/api/leads/ingest" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","whatsapp":"11999999999"}'

# Expected: HTTP 401
```

### DB Verification Queries (run in Supabase SQL Editor)

```sql
-- Verify table exists with correct columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'leads'
ORDER BY ordinal_position;

-- Verify trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'leads' AND trigger_schema = 'public';

-- Verify RLS policies
SELECT policyname, cmd, roles::text
FROM pg_policies
WHERE tablename = 'leads' AND schemaname = 'public';

-- Verify phone normalization (INGST-03)
-- After running Test 1 above, check:
SELECT whatsapp, length(whatsapp) as digit_count
FROM public.leads
WHERE lead_source_id = 'meta_123';
-- Expected: whatsapp = '5511999991234' (digits only, no +, spaces, dashes)

-- Verify form_answers jsonb (INGST-04)
SELECT form_answers, raw_payload
FROM public.leads
WHERE lead_source_id = 'meta_123';
-- Expected: form_answers contains {"objetivo": "Emagrecer"}, NOT name/whatsapp/lead_id

-- Verify RLS blocks anon access
-- (Run as service role — should see rows)
SELECT count(*) FROM public.leads;

-- Verify view exists
SELECT * FROM public.lead_funnel_by_status;

-- Verify Realtime publication
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'leads';
```

### Middleware Bypass Verification

Before connecting Make, confirm the bypass works:

```bash
# Without bypass deployed: POST returns HTML with 302 Location header
# With bypass deployed: POST proceeds to route handler

curl -v -X POST "$BASE_URL/api/leads/ingest" \
  -H "x-webhook-secret: wrong" \
  -H "Content-Type: application/json" \
  -d '{}'

# If bypass is working: you see HTTP/1.1 401 Unauthorized + JSON body
# If bypass is NOT working: you see HTTP/1.1 302 Found + Location: /login
```

### Wave 0 Gaps

No test framework to install. All validation is manual. No gaps to fill — just run the curl suite.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `timingSafeEqual`, webhook runtime | Yes | 24.14.1 | — |
| Next.js 16 | Route Handler, middleware | Yes | 16.2.10 | — |
| @supabase/supabase-js | Service-role DB client | Yes | 2.110.1 | — |
| Supabase project (remote) | DB writes, RLS, schema | Yes (assumed — existing app works) | — | — |
| `SUPABASE_SERVICE_ROLE_KEY` env var | Service client | MISSING — must add | — | None — blocks production |
| `WEBHOOK_SECRET` env var | Secret validation | MISSING — must add | — | None — blocks production |
| Vercel env vars | Production deployment | Assumed (project already deployed) | — | — |

**Missing dependencies with no fallback:**
- `SUPABASE_SERVICE_ROLE_KEY` — must be added to `.env.local` AND Vercel before the webhook route is deployed to production
- `WEBHOOK_SECRET` — must be added to `.env.local` AND Vercel AND Make's HTTP module configuration

**Missing dependencies with fallback:**
- None

---

## Open Questions

1. **Exact Meta Instant Form field names from Make**
   - What we know: The payload will contain `name`, some phone field, and up to 3 custom question answers
   - What's unclear: Are the custom fields named `answer_1`, `answer_2`, `answer_3` or the actual question text? What exact key does Make use for `phone`?
   - Recommendation: The flexible normalization pattern (D-05 with multiple aliases) handles this — document the known aliases and confirm with the user before production

2. **`lead_source_id` when Make does NOT send `lead_id`**
   - What we know: D-07 maps `body.lead_id ?? body.leadId` to `lead_source_id`
   - What's unclear: If Make doesn't send either field, `lead_source_id` will be NULL. Two rows with NULL `lead_source_id` do NOT conflict (NULL != NULL in SQL unique constraints) — so idempotency breaks when `lead_source_id` is absent
   - Recommendation: Log a warning when `lead_source_id` is null at ingest time. Confirm with user that Make always sends `lead_id` from Meta Instant Forms

3. **`dona` role and the `/leads` route (deferred but noted)**
   - Per STATE.md: "Decidir se role `dona` tem acesso read-only a `/leads` ou é bloqueada no middleware"
   - Phase 1 decision (D-09): RLS blocks `dona` from reading `leads` data. But the middleware currently allows `dona` to navigate to any non-role-restricted page. A `dona` hitting `/leads` would get an empty list (RLS returns no rows) rather than a redirect
   - Phase 1 scope: RLS handles data protection. Middleware block for `dona` → `/leads` is Phase 3 work when the page is built

---

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handler API, `Response.json()` usage, POST handler signature
- `node_modules/next/dist/docs/01-app/03-api-reference/07-edge.md` — Edge vs Node.js runtime, crypto API availability
- `node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts` (lines 1144–1395) — upsert API, `onConflict`, `ignoreDuplicates` signature
- `middleware.ts` (project source) — current matcher regex, exact function structure to modify
- `supabase/schema.sql` (project source) — confirmed `set_updated_at()` does not yet exist
- `package.json` (project source) — confirmed versions: next 16.2.10, @supabase/supabase-js 2.110.1
- `lib/types.ts` (project source) — confirmed type convention: `type` not `interface`, `Record<K,V>`

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — webhook architecture patterns, data flow diagram
- `.planning/research/PITFALLS.md` — PITFALL-W1 through R4 — pitfall analysis
- `.planning/research/STACK.md` — stack decisions, service client pattern
- `.planning/phases/01-schema-webhook-foundation/01-CONTEXT.md` — all locked decisions D-01 through D-14

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against package.json and node_modules
- Route Handler API: HIGH — verified against installed Next.js 16 docs
- Upsert API: HIGH — verified against @supabase/postgrest-js source
- `timingSafeEqual` runtime: HIGH — verified Node vs Edge runtime docs
- Schema patterns: HIGH — verified against existing schema.sql
- Pitfalls: HIGH — grounded in existing codebase + PITFALLS.md
- Validation: MEDIUM — no existing test infrastructure; curl tests are proposed patterns, not verified scripts

**Research date:** 2026-07-09
**Valid until:** 2026-08-09 (stable stack; 30-day window)
