# Research Summary — v1.1 Lead Pipeline + Dashboard Upgrade

## TL;DR

- Zero novas dependências npm — toda capacidade necessária já está no stack instalado.
- O bypass do middleware para `/api/leads/ingest` deve ser o PRIMEIRO código commitado; sem ele Make recebe 302 e leads nunca chegam.
- O webhook DEVE usar o service-role client (não anon key) — políticas RLS `to authenticated` bloqueiam inserts anon sem nenhum erro ao caller.
- `daily_entries` e `leads` se sobrepõem em 4 métricas; double-counting é garantido a menos que autoridade de métrica seja declarada antes de qualquer query do dashboard.
- Ordem de build de 3 fases (Schema/Webhook → Dashboard → CRM UI) é a sequência correta.

---

## Stack Additions

**Nenhuma nova dependência npm.** Tudo já presente:

| Necessidade | Já Disponível |
|-------------|---------------|
| Webhook endpoint | Next.js 16 Route Handler (`app/api/`) |
| Admin DB writes | `@supabase/supabase-js` 2.110.1 com service-role key |
| Notificações Realtime | Supabase Realtime bundled no client existente |
| Status badge UI | `lucide-react` + sistema de tokens CSS existente |
| Tabela de leads | `<table>` plain — volume < 500/mês, sem virtualização |
| Secret timing-safe | `crypto.timingSafeEqual` built-in do Node.js |

Novas env vars: `WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` (server-only, nunca `NEXT_PUBLIC_`).

---

## Feature Table Stakes

Sem qualquer item abaixo, a SDR continua na planilha Google:

| Feature | Por que não-negociável |
|---------|------------------------|
| Webhook `POST /api/leads/ingest` com validação `x-webhook-secret` | Ingestão automática do Make; entrada manual anula o propósito |
| Tabela `leads` com check constraint de 8 status | Modelo de dados core; decisões de schema são irreversíveis |
| Página de lista de leads: nome, WhatsApp, status, data | Único lugar para a SDR ver todos os leads |
| Dropdown de status inline com optimistic update | Ação primária da SDR; deve parecer instantânea |
| Campo de notas por lead | SDR registra resultado da ligação |
| Filtro por status | Lista inutilizável com 50+ leads sem filtro |
| Dashboard agrega do CRM (sem double-count) | Fecha o core value loop; elimina re-entrada manual |

Defer v2+: kanban, WhatsApp Business API, lead scoring, duplicate merge, calendário.

---

## Architecture Decisions

| Decisão | O que significa na prática |
|---------|---------------------------|
| Middleware bypass primeiro | `WEBHOOK_PATHS` early-return em `middleware.ts`; deployar antes de conectar Make |
| Service-role client em arquivo dedicado | `lib/supabase/service.ts` — server-only, nunca em client components; bypass RLS |
| Postgres view para agregados | `lead_funnel_by_status` retorna 8 rows max; RLS propaga automaticamente |
| `answers jsonb` | Perguntas Meta variam por campanha; jsonb evita migrações quando campanha muda |
| `lead_source_id text unique` + upsert | Idempotency key do Meta `lead_id`; retries do Make viram no-ops |
| Hook `useLeadMetrics`, não expansão do monolith | Dashboard tem 291 linhas; dados CRM via hook independente, não no `useEffect` existente |
| CRM como autoridade de métrica | Declarar por métrica antes de qualquer query; revenue e investimento ficam manuais |

---

## Watch Out For

1. **Middleware redirect engole webhook silenciosamente (CRÍTICO)** — Make recebe 302 HTML, acha que funcionou, leads somem. Fix: `WEBHOOK_PATHS` early-return antes de qualquer lógica de auth.

2. **Anon client falha RLS silenciosamente (HIGH)** — Insert retorna sem erro mas dado nunca chega. Fix: sempre usar `createServiceClient()` com `SUPABASE_SERVICE_ROLE_KEY`.

3. **Double-counting de métricas (HIGH)** — `daily_entries` já possui `appointments_count`, `attendances_count`, `closings_count`. Fix: tabela de autoridade de métricas em PROJECT.md antes de qualquer query do dashboard.

4. **Retries do Make criam leads duplicados (HIGH)** — Timeouts causam retry; insert original pode ter sucedido. Fix: `lead_source_id text unique` no DDL desde o dia 1 + `.upsert({ onConflict: 'lead_source_id', ignoreDuplicates: true })`.

5. **PII em `leads` viola LGPD para role `dona` (MEDIUM)** — `leads` contém nome e telefone de pacientes. Fix: restringir `leads_select` para `sdr` e `gestor`; bloquear `/leads` no middleware para `dona`.

---

## Build Order

**Fase 1 — Schema + Webhook (fundação; tudo depende disso)**
- Supabase: tabela `leads`, trigger, RLS, view, constraint `lead_source_id`
- `lib/types.ts`: `LeadStatus`, `Lead`, `LEAD_STATUS_LABELS`
- `lib/supabase/service.ts`: client service-role
- `middleware.ts`: bypass para `/api/leads/ingest`
- `app/api/leads/ingest/route.ts`: validação, normalização de telefone, upsert idempotente
- Deploy + testar com `curl` antes de conectar o Make

**Fase 2 — Dashboard Integration**
- Declarar autoridade de métrica em PROJECT.md primeiro
- Hook `useLeadMetrics(dateRange)` — loading state independente
- Componente `LeadFunnelCard` consumindo a view
- Corrigir bug das sparklines junto com integração CRM
- Skeleton loading em todos os cards do dashboard

**Fase 3 — CRM UI + UX Hardening**
- `app/(app)/leads/page.tsx`: lista com filtros de status, dropdown inline, optimistic update
- `components/LeadTable.tsx`, `LeadStatusBadge.tsx`
- Link no Sidebar para `/leads`
- Supabase Realtime para notificação de novo lead
- Dialog de confirmação para status terminal
- UX fixes: forgot password, validação de formulário, confirmação de sobrescrita

---

## Open Questions

1. **Nomes dos campos do Meta Instant Form:** `answers jsonb` lida com qualquer shape, mas a UI precisa saber quais keys surfaçar nas 3 perguntas customizadas. Confirmar com o Make antes de finalizar a Fase 1.
2. **Timing do cutover de métricas:** Quando a equipe para de entrar `appointments_count` manualmente no `daily_entries`? Padrão dual-source cobre a transição.
3. **Role `dona` na `/leads`:** RLS bloqueia writes, mas deve o route ser totalmente bloqueado no middleware? Ou read-only é aceitável?
4. **`SUPABASE_SERVICE_ROLE_KEY` no Vercel:** Dependência de ops fora do codebase — deve ser adicionada antes do deploy da Fase 1.
5. **Realtime de notificação:** Confirmado para Fase 3 ou diferido para v1.2?

---

*Research synthesized: 2026-07-09 — Confidence: HIGH (MEDIUM apenas para field names do formulário Meta)*
