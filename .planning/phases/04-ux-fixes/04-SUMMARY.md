---
phase: 04-ux-fixes
plan: 04
subsystem: ux
tags: [auth, supabase, forms, validation, theme, react, nextjs]

# Dependency graph
requires:
  - "lib/supabase/client.ts: createClient() browser client"
  - "components/AuthCard.tsx: shared auth layout component"
  - "app/auth/callback/route.ts: Supabase code exchange handler"
  - "middleware.ts: PUBLIC_PATHS list"
provides:
  - "app/forgot-password/page.tsx: password reset email flow via Supabase"
  - "app/reset-password/page.tsx: new password form after email link"
  - "UX-02: overwrite warning in lancamento form when today entry exists"
  - "UX-03: attendance count validation before submit in lancamento form"
  - "UX-04: ThemeToggle initialized from DOM class — no hydration flash"
affects: [login-flow, lancamento-form, sidebar-theme]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase resetPasswordForEmail + updateUser for password reset flow"
    - "Auth callback route supports ?next= param to redirect after code exchange"
    - "Lazy initial state via useState(getInitialDark) reads DOM before first render — no useEffect needed for sync"
    - "Inline validation: blocking submit until attendance/no-show/rescheduled <= appointments"

key-files:
  created:
    - app/forgot-password/page.tsx
    - app/reset-password/page.tsx
  modified:
    - app/auth/callback/route.ts
    - app/login/page.tsx
    - middleware.ts
    - app/(app)/lancamento/page.tsx
    - components/ThemeToggle.tsx

key-decisions:
  - "Auth callback now reads ?next= param and redirects there instead of always going to /dashboard — required for reset-password flow"
  - "ThemeToggle uses lazy initializer function (not value) in useState to run getInitialDark() synchronously on first render, reading the class the layout script set before React hydrated"
  - "Overwrite warning shown only when selected date == today AND an entry already exists (not for historical edits, which already show filled fields as the implicit signal)"
  - "Validation runs inside handleSubmit before network request — clears on any field change to avoid stale error"

requirements-completed: [UX-01, UX-02, UX-03, UX-04]

# Metrics
duration: ~25min
completed: 2026-07-09
---

# Phase 04: UX Fixes Summary

**Password reset flow via Supabase, lancamento form overwrite warning + attendance validation, and ThemeToggle hydration flash eliminated**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-09
- **Tasks:** 4 requirements (UX-01 through UX-04), all complete
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

### UX-01 — Forgot password + reset password flow

- Created `app/forgot-password/page.tsx`: email form calling `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/auth/callback?next=/reset-password" })`. Shows success state after send. Design consistent with login/signup pages using `AuthCard`.
- Created `app/reset-password/page.tsx`: two-field form (new password + confirm), calls `supabase.auth.updateUser({ password })`, redirects to dashboard on success.
- Updated `app/auth/callback/route.ts`: now reads `?next=` query param and uses it as the redirect target after `exchangeCodeForSession`. Default is `/dashboard` (backwards compatible).
- Updated `app/login/page.tsx`: added "Esqueci minha senha" link pointing to `/forgot-password`, positioned right-aligned below the submit button.
- Updated `middleware.ts`: added `/forgot-password` and `/reset-password` to `PUBLIC_PATHS` so unauthenticated users can access these routes.

### UX-02 — Lancamento overwrite warning

- `entryExists` boolean state tracks whether the loaded date has an existing DB record.
- Warning banner with `AlertTriangle` icon (amber/warning color) appears inline below the date picker when `entryExists && date === today`. Message: "Já existe um lançamento para hoje. Esta ação vai **sobrescrever** os dados atuais."
- Submit button label changes from "Salvar lançamento do dia" to "Atualizar lançamento" when `entryExists` is true.
- `entryExists` is updated to `true` after a successful save/upsert.

### UX-03 — Form attendance validation

- Before submitting, `validate()` checks: `attendances + no_shows + rescheduled <= appointments`.
- If the constraint fails, an inline error banner (red, with `AlertTriangle` icon) is shown below the fields; submit is blocked.
- Validation error clears whenever any field changes.

### UX-04 — ThemeToggle hydration flash fix

- Replaced `useState(false)` + `useEffect(() => { sync() }, [])` with `useState<boolean>(getInitialDark)` — lazy initializer pattern.
- `getInitialDark()` reads `document.documentElement.classList.contains("dark")` synchronously. Because the layout's `beforeInteractive` script runs before React hydrates, the class is already set correctly when the component first renders on the client.
- Returns `false` during SSR (no `document` object) — this matches the server render and avoids hydration mismatch. The class from the script sets the correct visual state without React needing to re-render for the icon.
- Removed `useEffect` entirely — no async sync needed.

## Task Commits

| Task  | Description                                        | Files                                                                                   |
|-------|----------------------------------------------------|-----------------------------------------------------------------------------------------|
| UX-01 | feat(04): forgot-password + reset-password pages   | app/forgot-password/page.tsx, app/reset-password/page.tsx, app/auth/callback/route.ts, app/login/page.tsx, middleware.ts |
| UX-02 | feat(04): overwrite warning in lancamento form     | app/(app)/lancamento/page.tsx                                                           |
| UX-03 | feat(04): attendance validation in lancamento form | app/(app)/lancamento/page.tsx (combined with UX-02)                                     |
| UX-04 | fix(04): ThemeToggle hydration flash via lazy init | components/ThemeToggle.tsx                                                              |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all flows are wired end-to-end using existing Supabase Auth client.

## Self-Check

Files created/modified:
- FOUND: app/forgot-password/page.tsx
- FOUND: app/reset-password/page.tsx
- FOUND: app/auth/callback/route.ts (modified)
- FOUND: app/login/page.tsx (modified)
- FOUND: middleware.ts (modified)
- FOUND: app/(app)/lancamento/page.tsx (modified)
- FOUND: components/ThemeToggle.tsx (modified)

## Self-Check: PASSED

---
*Phase: 04-ux-fixes*
*Completed: 2026-07-09*
