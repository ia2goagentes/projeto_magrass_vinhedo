# Dashboard Funil — Clínica Magras Vinhedo

## What This Is

Dashboard de funil de vendas para a Clínica Magras Vinhedo, construído para que gestor e SDR acompanhem em tempo real o desempenho das campanhas de anúncios no Meta até a conversão em pacientes. Inclui controle de acesso por role (gestor, SDR, dona, convidado), lançamento diário de métricas, metas e histórico. O próximo passo é integrar o CRM de leads diretamente ao sistema, substituindo a planilha atual.

## Core Value

SDR e gestor enxergam o funil completo — de lead a venda fechada — em um único lugar, sem depender de planilhas externas.

## Current Milestone: v1.1 Lead Pipeline + Dashboard Upgrade

**Goal:** Substituir a planilha de leads por um CRM integrado que recebe leads automaticamente via Make/Meta, dá à SDR uma interface de trabalho única e alimenta o dashboard com dados reais do funil.

**Target features:**
- CRM de Leads com webhook para Make (ingestion automática)
- Pipeline de status de leads: Novo → Contatado → Agendado → Compareceu / No-show → Comprou / Perdido / Sem interesse
- Integração CRM → Dashboard (agendamentos, comparecimentos e fechamentos derivam dos leads)
- Dashboard visual upgrade (cards, skeleton, funil, gráficos)
- UX fixes prioritários (forgot password, validação de formulário, confirmação ao sobrescrever)

## Requirements

### Validated

- ✓ Auth multi-role (gestor, SDR, dona, pendente, convidado) — v1.0
- ✓ Formulário de lançamento diário (SDR) — v1.0
- ✓ Dashboard com métricas de funil e gráficos — v1.0
- ✓ Lançamento semanal de métricas de anúncios (Meta) — v1.0
- ✓ Gestão de metas por métrica — v1.0
- ✓ Histórico de lançamentos (diário e semanal) — v1.0
- ✓ Dark mode com preferência persistida em localStorage — v1.0
- ✓ Layout responsivo com sidebar desktop + MobileNav — v1.0
- ✓ RLS no Supabase cobrindo todas as tabelas — v1.0

### Active

<!-- v1.1 — Lead Pipeline + Dashboard Upgrade -->
- [ ] Webhook POST `/api/leads/ingest` que recebe lead do Make e persiste na tabela `leads`
- [ ] Listagem de leads com nome, WhatsApp, respostas do formulário, status e data de criação
- [ ] SDR pode atualizar status do lead (Novo / Contatado / Agendado / Compareceu / No-show / Comprou / Perdido / Sem interesse)
- [ ] SDR pode adicionar notas por lead
- [ ] Dashboard agrega métricas de agendamentos, comparecimentos e fechamentos a partir dos leads do CRM
- [ ] Cards do dashboard com design moderno e skeleton loading
- [ ] Gráfico de funil com % claramente legíveis
- [ ] Fluxo de recuperação de senha (forgot password)
- [ ] Confirmação visual ao sobrescrever lançamento existente
- [ ] Validação: atendimentos + no-shows + reagendados ≤ agendamentos

### Out of Scope

- Multi-tenancy (multi-clínica) — arquitetura atual é single-tenant; migração é grande demais para este milestone
- Envio de mensagens / WhatsApp Business API — não foi solicitado neste milestone
- App mobile nativo — PWA pelo browser é suficiente por ora
- Virtualização de lista de leads — volume esperado < 500 leads/mês, não justifica

## Context

**Projeto existente (brownfield):** Codebase construído antes da adoção do GSD. Codebase mapeado em 2026-07-09 via `/gsd:map-codebase` — ver `.planning/codebase/` para detalhe de stack, arquitetura e concerns.

**Integração Make existente:** Meta Instant Form → Google Sheets → email para SDR. A extensão prevista para v1.1 é: Meta Instant Form → Sheets (mantém) + webhook no sistema → notifica SDR.

**Dados do lead (formulário Meta):** Nome, WhatsApp + 3 perguntas customizadas da campanha.

**Planilha atual:** A SDR usa uma planilha Google para rastrear status dos leads. O objetivo do CRM é substituir essa planilha sem remover a integração com Sheets (que continua como backup/histórico).

**Tech debt relevante para v1.1:** Funções duplicadas (`initialsFor`, `currency`, `formatWeekLabel`, `formatDate`), `getUser()` chamado no submit (redundante), dashboard monolítico de 291 linhas — endereçar durante as fases do milestone.

## Constraints

- **Tech stack:** Next.js 16 + Supabase + Tailwind v4 — manter; sem novas dependências de banco ou auth
- **Supabase:** Usar RLS em toda nova tabela; webhook deve ser endpoint Next.js API Route (não Supabase Edge Function) para manter tudo no mesmo repositório
- **Roles:** SDR atualiza leads; dona e gestor apenas visualizam; webhook é público (sem auth, protegido por secret no header)
- **Make secret:** O endpoint de webhook deve validar um header `x-webhook-secret` para evitar inserções não autorizadas

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js App Router (não Pages Router) | Projeto iniciado com App Router; SSR e Server Components disponíveis | ✓ Good |
| Supabase como BaaS | Auth + DB + RLS em um serviço; equipe pequena, sem infra própria | ✓ Good |
| Tailwind v4 CSS-first (sem tailwind.config) | Design tokens como CSS custom properties — mais flexível para theming | ✓ Good |
| Webhook no Next.js API Route (não Edge Function) | Mesma repo, mesmo deploy, sem cold start de Edge Function separada | — Pending |
| Lançamento manual de anúncios mantido separado do CRM | CRM cobre leads orgânicos e pagos; investimento (Meta Ads) continua no formulário semanal | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-09 — Milestone v1.1 started (first GSD cycle on this brownfield project)*
