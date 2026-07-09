# GSD State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-09)

**Core value:** SDR e gestor enxergam o funil completo — de lead a venda fechada — em um único lugar, sem depender de planilhas externas.
**Current focus:** Phase 1 — Schema + Webhook Foundation

## Current Position

Milestone: v1.1 Lead Pipeline + Dashboard Upgrade
Phase: 1 — Schema + Webhook Foundation
Plan: Not started
Status: Roadmap created — ready to plan Phase 1
Last activity: 2026-07-09 — Roadmap written (4 phases, 21 requirements mapped)

Progress: [....................] 0% (0/4 phases complete)

## Roadmap Summary

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 1 — Schema + Webhook Foundation | System accepts and persists leads from Make idempotently | INGST-01–04 | Not started |
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
- Phase 1 CRITICAL: middleware bypass deve ser o primeiro commit — sem ele Make recebe 302 e leads somem silenciosamente
- Phase 1 CRITICAL: usar service-role client (não anon) para inserts na tabela leads — RLS bloqueia anon silenciosamente
- Phase 2: declarar autoridade de métrica (leads vs daily_entries) em PROJECT.md ANTES de escrever qualquer query do dashboard para evitar double-counting
- `SUPABASE_SERVICE_ROLE_KEY` e `WEBHOOK_SECRET` precisam ser adicionados ao Vercel antes do deploy da Phase 1

## Pending Decisions

- Definir as 3 perguntas customizadas do formulário Meta (nomes dos campos que chegam do Make) — necessário antes de finalizar Phase 1
- Confirmar secret do webhook com o usuário antes de configurar o Make
- Decidir se role `dona` tem acesso read-only a `/leads` ou é bloqueada no middleware (SUMMARY.md open question #3)
- Confirmar quando equipe para de entrar `appointments_count` manualmente no `daily_entries` (cutover de métricas)

## Blockers

None
