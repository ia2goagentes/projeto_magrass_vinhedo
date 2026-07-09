---
phase: 02
plan: 01
subsystem: dashboard
tags: [ui, crm, hooks, skeleton, sparklines, refactor]
dependency_graph:
  requires: [Phase 1 schema (lead_funnel_by_status view)]
  provides: [LeadFunnelCard, DashboardSkeleton, useDashboardData hooks, redesigned metric cards]
  affects: [app/(app)/dashboard/page.tsx, components/HeroSummary, components/CostMetricCards, components/FunnelChart]
tech_stack:
  added: []
  patterns:
    - Custom hooks para separação IO/cálculo (useDashboardStatic, useDashboardRange, useDashboardDerived, useLeadMetrics)
    - animate-pulse skeleton loading via Tailwind v4
    - Fallback silencioso quando view Supabase não existe
key_files:
  created:
    - hooks/useDashboardData.ts
    - components/DashboardSkeleton.tsx
    - components/LeadFunnelCard.tsx
  modified:
    - app/(app)/dashboard/page.tsx
    - components/HeroSummary.tsx
    - components/CostMetricCards.tsx
    - components/FunnelChart.tsx
decisions:
  - Sparkline usa weekly data filtrada por bucket em vez do weeklyAgg global
  - LeadFunnelCard usa fallback silencioso para não quebrar se Phase 1 não foi deployada
  - useDashboardDerived recebe DashboardRangeData para não duplicar estado
metrics:
  duration: ~90min
  completed_date: 2026-07-09
  tasks_completed: 6
  files_changed: 7
---

# Phase 2 Plan 01: Dashboard CRM Integration + Visual Upgrade — Summary

**One-liner:** Skeleton loading, badges de conversão coloridos, card de leads CRM, sparklines corrigidas e refatoração do monolito de 291 linhas em 4 hooks especializados.

---

## Requirements Implementados

| REQ-ID | Status | Descrição |
|--------|--------|-----------|
| DASH-03 | Completo | Card "Leads por Status" lendo `lead_funnel_by_status` |
| DASH-04 | Completo | Bug das sparklines corrigido — cada bucket usa weekly data filtrada |
| UI-01 | Completo | Skeleton animado com `animate-pulse` substitui "Carregando..." |
| UI-02 | Completo | Cards redesenhados: uppercase label, sublabel, hierarquia visual |
| UI-03 | Completo | Percentuais do funil como badges coloridos com fundo tintado |
| UI-04 | Completo | Lógica extraída do monolito em `hooks/useDashboardData.ts` |

---

## Arquivos Criados

### `hooks/useDashboardData.ts` (353 linhas)

4 hooks exportados:

- **`useDashboardStatic()`** — dados estáticos (perfil, fechamentos mensais, meta). Dispara uma vez no mount.
- **`useDashboardRange(range, previousRange, withComparison)`** — entries, weeklyRows, goals para o período selecionado. Reactivo ao range.
- **`useDashboardDerived(data, range, withComparison)`** — cálculos derivados via `useMemo`. Zero IO. Retorna `agg`, `metrics`, `sparklineSeries`, `buckets`, etc.
- **`useLeadMetrics()`** — query na view `lead_funnel_by_status`. Falha silenciosa se a view não existe.

### `components/DashboardSkeleton.tsx` (133 linhas)

Componentes de skeleton especializados:
- `HeroSkeleton`, `CostMetricsSkeleton`, `FunnelSkeleton`, `GenericCardSkeleton`, `LeadFunnelSkeleton`
- `DashboardSkeleton` compõe todos — usado no branch `{loading ? <DashboardSkeleton /> : <...>}`

### `components/LeadFunnelCard.tsx` (134 linhas)

Card de leads por status com:
- Barras de progresso por status (STATUS_ORDER definido)
- Cores mapeadas para tokens CSS existentes
- Skeleton inline durante carregamento
- Fallback de erro não-intrusivo (view pode não existir antes do deploy da Phase 1)

---

## Arquivos Modificados

### `app/(app)/dashboard/page.tsx`

Antes: 291 linhas — 2 `useEffect`, 8 `useState`, 9 `useMemo` inline.  
Depois: ~160 linhas — usa os 4 hooks, sem lógica de IO no componente.

Mudanças chave:
- `useState` + `useEffect` de dados removidos → `useDashboardStatic` + `useDashboardRange`
- `useMemo` de métricas → `useDashboardDerived`
- `loading ? "Carregando..." : ...` → `loading ? <DashboardSkeleton /> : ...`
- `<LeadFunnelCard>` adicionado após `<CostMetricCards>`

### `components/HeroSummary.tsx`

UI-02: Cada card agora tem `label` (uppercase tracking-wider) + `sublabel` (lowercase descrição), ícone com `rounded-xl` e cor distinta por métrica (verde para faturamento, azul para fechamentos, rosa só para CAC fora do target).

### `components/CostMetricCards.tsx`

UI-02: Label curto em `METRIC_SHORT_LABEL` + descrição expandida abaixo, sparkline separada por divisor `border-t`, badge de delta com tamanho reduzido para não competir com o valor.

### `components/FunnelChart.tsx`

UI-03: Coluna "Conversão" agora usa `<RateBadge>` com fundo `color-mix` tintado na cor do estágio. No-show e remarcação exibidos como chips coloridos (`status-serious`, `status-warning`) em vez de texto simples.

---

## Correção do Bug DASH-04 — Sparklines

**Root cause identificado:** O cálculo de `sparklineSeries` passava `weeklyAgg` (soma de TODAS as semanas do período) para cada bucket individualmente. Quando o período tinha mais de 1 semana, todos os buckets recebiam o mesmo investimento total → CPL/CPA/CAC/ROAS idênticos em todos os pontos → linha reta.

**Correção em `useDashboardDerived`:**
```typescript
// Para cada bucket, filtra as semanas que se sobrepõem à data do bucket
const bucketWeekly = weeklyRows.filter((w) => {
  return w.week_start <= bucketStart &&
    toDateKey(new Date(new Date(w.week_start).getTime() + 6 * 24 * 60 * 60 * 1000)) >= bucketStart;
});
const bucketWeeklyAgg = bucketWeekly.length > 0
  ? aggregateWeeklyMetrics(bucketWeekly)
  : { ...distribuiçãoProporcional }; // fallback proporcional se sem match
```

---

## Deviations from Plan

None — todas as funcionalidades implementadas conforme especificado. Zero novas dependências npm adicionadas.

---

## Known Stubs

**`LeadFunnelCard` — view `lead_funnel_by_status` pode não existir**

- **Arquivo:** `components/LeadFunnelCard.tsx` + `hooks/useDashboardData.ts`
- **Comportamento:** Se a Phase 1 não foi deployada (schema Supabase não aplicado), `useLeadMetrics` retorna erro silencioso e o card exibe "Dados de leads não disponíveis ainda."
- **Resolução:** Deploy da Phase 1 (schema DDL no Supabase) ativa automaticamente o card.
- **Impacto:** Card funciona em 0% até Phase 1 ser deployada; não quebra nenhuma funcionalidade existente.

---

## Self-Check

**Arquivos criados:**
- `hooks/useDashboardData.ts` — EXISTE (353 linhas)
- `components/DashboardSkeleton.tsx` — EXISTE (133 linhas)
- `components/LeadFunnelCard.tsx` — EXISTE (134 linhas)

**Commits realizados:**
- `d354889` — refactor(02): extrai logica do dashboard em hooks reutilizaveis (UI-04)
- `efacda5` — feat(02): skeleton loading animado nos cards do dashboard (UI-01)
- `918f0cc` — feat(02): card Leads por Status integrando view lead_funnel_by_status (DASH-03)
- `27745b2` — feat(02): melhora design dos cards de metricas com tipografia e hierarquia visual (UI-02)
- `6db1a12` — feat(02): percentuais do funil como badges coloridos mais legiveis (UI-03)
- `9338c83` — feat(02): integra hooks, skeleton e LeadFunnelCard no dashboard (UI-01, UI-04, DASH-03, DASH-04)

**TypeScript:** `tsc --noEmit` sem erros.

## Self-Check: PASSED
