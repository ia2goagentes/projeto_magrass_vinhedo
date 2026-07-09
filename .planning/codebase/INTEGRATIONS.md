# External Integrations

**Analysis Date:** 2026-07-09

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - Primary data layer: PostgreSQL database, authentication, Row Level Security
  - SDK (browser): `@supabase/supabase-js` 2.110.1 via `lib/supabase/client.ts` (`createBrowserClient`)
  - SDK (server/middleware): `@supabase/ssr` 0.12.0 via `lib/supabase/server.ts` (`createServerClient`) and `middleware.ts`
  - Auth method: URL + anon key (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

**Font Delivery:**
- Google Fonts (via `next/font/google`) - Geist Sans and Geist Mono loaded at build time and self-hosted by Next.js

## Data Storage

**Database:**
- Supabase (PostgreSQL) — hosted, managed
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (env var)
  - Client: `@supabase/supabase-js` (no ORM — raw `.from().select()` queries)
  - Tables: `profiles`, `daily_entries`, `weekly_ad_metrics`, `goals`
  - Schema file: `supabase/schema.sql` (run manually in Supabase SQL Editor)

**File Storage:**
- Not used — no Supabase Storage, S3, or local file upload detected

**Caching:**
- None — no Redis, Upstash, or in-memory caching layer detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email + password)
  - Login: `supabase.auth.signInWithPassword()` — `app/login/page.tsx`
  - Signup: handled at `app/signup/page.tsx` (creates a `profiles` row as `pendente` via database trigger `on_auth_user_created`)
  - OAuth callback: `app/auth/callback/route.ts` — exchanges code for session via `supabase.auth.exchangeCodeForSession()`
  - Session: cookie-based, refreshed by middleware on every request
  - No OAuth providers (Google, GitHub, etc.) detected

**Authorization:**
- Custom role system in `middleware.ts`, enforced via Supabase RLS policies
- Roles: `pendente`, `sdr`, `dona`, `gestor`, `convidado`
- Role stored in `public.profiles.role`; read by a `security definer` SQL function `public.current_role()`
- Route protection matrix (middleware):
  - `/metas`, `/usuarios`, `/anuncios` — `gestor` only
  - `/lancamento` — `sdr` or `gestor`
  - `/pendente` — users with `pendente` role
  - All other routes — any authenticated non-`pendente` user

## Monitoring & Observability

**Error Tracking:**
- None detected — no Sentry, Datadog, or similar SDK imported

**Logging:**
- Console only — no structured logging library

**Analytics:**
- None detected

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in code — `DEPLOY.md` exists at project root (contents not read)
- No `vercel.json`, `netlify.toml`, or Dockerfile detected

**CI Pipeline:**
- None detected — no `.github/workflows/`, `.gitlab-ci.yml`, or similar

## Environment Configuration

**Required environment variables (observed in source):**

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts` | Supabase project URL, public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts` | Supabase anon key, public |

Both variables are prefixed `NEXT_PUBLIC_` — they are exposed to the browser bundle.

**Secrets location:**
- No `.env.local.example` file detected at project root
- Variables must be set in `.env.local` (not committed) or in the hosting platform's environment settings

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/callback` (`app/auth/callback/route.ts`) — Supabase OAuth/magic-link code exchange endpoint

**Outgoing:**
- None detected

## Supabase Project Details

**Database triggers:**
- `on_auth_user_created` on `auth.users` → runs `handle_new_user()` to auto-create `profiles` row as `pendente`

**RLS policies summary:**
- `profiles`: users read own row; gestor reads all; only gestor can update
- `daily_entries`: all authenticated users read; `sdr` and `gestor` can write
- `weekly_ad_metrics`: all authenticated users read; only `gestor` can write
- `goals`: all authenticated users read; only `gestor` can write

---

*Integration audit: 2026-07-09*
