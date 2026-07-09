# Feature Landscape — Lead CRM (v1.1)

**Domain:** CRM embedded para clínica de estética médica rodando Meta Ads com Instant Forms
**Researched:** 2026-07-09
**Confidence:** HIGH para UX patterns e pipeline design; MEDIUM para integração dashboard

---

## Summary

Este é um CRM small-team embutido num dashboard existente. A SDR é a usuária principal. Os leads chegam via Make webhook do Meta Instant Form. O core job: dar à SDR um lugar único para ver todos os leads, atualizar status após cada ligação, deixar uma nota, e nunca perder o rastro de quem precisa de callback.

O pipeline especificado no PROJECT.md — Novo → Contatado → Agendado → Compareceu / No-show → Comprou / Perdido / Sem interesse — mapeia exatamente o funil padrão de clínicas de estética médica. Está correto e não precisa de redesign.

**Insight crítico:** Os status do CRM SÃO as métricas do funil. Uma vez que os leads alimentem o dashboard, os lançamentos manuais ficam redundantes para os counts que o CRM pode derivar (agendamentos, comparecimentos, vendas). O lançamento manual persiste apenas para campos que o CRM não fornece: valor de receita e investimento em anúncios.

---

## Table Stakes

Sem qualquer um desses, a SDR continua usando a planilha Google.

| Feature | Por que esperado | Complexidade | Dependência |
|---------|-----------------|--------------|-------------|
| Página de leads: nome, WhatsApp, status, data | Interface core. SDR precisa de todos os leads em um lugar | Baixa | Nova rota `/leads` e tabela `leads` |
| Status inline update (dropdown por linha) | Ação primária da SDR. Atualizar status é o trabalho principal do CRM | Baixa | Mutates `leads.status`; mesmo padrão Supabase das formas existentes |
| Webhook POST `/api/leads/ingest` com validação de `x-webhook-secret` | Auto-ingestion do Make. Sem isso, leads precisam de entrada manual — anula o propósito | Média | Nova API Route; adiciona env var `WEBHOOK_SECRET` |
| Notas por lead (append-only) | SDR registra o que foi dito em cada ligação. Campo de texto único causa sobrescrita; log é mais seguro | Média | Tabela `lead_notes` separada ou campo `notes text` na tabela leads |
| `status = 'novo'` atribuído automaticamente na ingestão | SDR não pode receber leads sem status | Baixa | Depende do webhook endpoint |
| Detalhe de lead (drawer ou expand) | Número de WhatsApp, 3 respostas do formulário Meta, notas precisam de espaço além da linha da lista | Baixa–Média | Nenhuma |
| Filtro por status | SDR trabalha "Novo" primeiro, depois follow-ups "Contatado". Sem filtro, lista é inutilizável em 50+ leads | Baixa | WHERE clause SQL na tabela `leads` |

---

## Differentiators

Alto valor relativo à complexidade. Cada um é deployável independentemente.

| Feature | Proposta de Valor | Complexidade | Dependência |
|---------|-------------------|--------------|-------------|
| Dashboard funnel metrics from CRM | Elimina double-entry. Agendamentos, comparecimentos, vendas vêm dos counts do CRM. Fecha o core value loop do PROJECT.md | Média | Requer tabela leads populada (webhook). Dashboard query em `leads`. Transição com fallback manual para períodos históricos |
| Skeleton loading nos cards do dashboard | Elimina "Carregando..." com layout shift (documentado no CONCERNS.md). Melhoria de perceived performance | Baixa | Nenhuma dep nova |
| Design moderno nos cards do dashboard | Visual polish, legibilidade. Tokens Tailwind v4 já configurados | Baixa–Média | Tokens `--surface-card`, `--status-*` já em `globals.css` |
| Gráfico de funil com % legíveis | Chart atual tem percentuais ilegíveis (mencionado no PROJECT.md). Fix direto para reclamação documentada | Baixa | recharts já instalado |
| WhatsApp deep link por lead | `https://wa.me/55{phone}` transforma o número em contato com um clique. Zero esforço da SDR | Muito Baixa | Nenhuma |
| Sort por data de criação / última atualização | SDR prioriza por recência | Baixa | ORDER BY SQL; toggle de sort na UI |
| Badge de count por status | SDR vê "12 Novo" de relance sem filtrar | Baixa | Query de aggregate na tabela `leads` |

---

## Anti-Features

Explicitamente não construir no v1.1.

| Anti-Feature | Por que Evitar | Alternativa |
|--------------|----------------|-------------|
| Kanban board | Errado para trabalho de SDR fazendo ligações em série. Requer drag-and-drop lib (~40KB), layout responsivo de 7 colunas, suporte a touch. Alta complexidade para o usuário errado | Dropdown de status inline na lista. Defer kanban para v1.2 como view do gestor |
| WhatsApp Business API / auto-send | Requer Meta Business Account verificado, templates aprovados, BSP pago, revisão de compliance. Setup leva semanas. Explicitamente Out of Scope no PROJECT.md | Link `wa.me` para iniciação manual |
| Lead scoring / qualificação IA | Sem training data. Modelo seria inútil com < 500 leads/mês | Pipeline de status é a qualificação |
| Duplicate detection / merge | Edge case neste volume. Fuzzy matching complexidade supera frequência do problema | Aceitar duplicatas; SDR percebe naturalmente. Revisar em 1000+/mês |
| CSV lead import | Contradiz o propósito de auto-ingestion. Google Sheets continua como backup | Webhook cuida da ingestion |
| Integração de calendário para agendamentos | Requer Google Calendar OAuth ou componente de calendário. Status "Agendado" rastreia o evento; clínica usa sistema de agendamento separado | Campo de status é suficiente |
| Reatribuição de leads entre SDRs | SDR única hoje. Assignment adiciona complexidade de schema sem benefício atual | Leads pertencem à clínica implicitamente |

---

## Pipeline Status UX Recommendation

**Usar: Dropdown de status inline na linha da lista, com optimistic update.**

**Option A — Inline dropdown (RECOMENDADO)**
- SDR seleciona status em dropdown diretamente na linha do lead, sem sair da lista
- Optimistic UI: mostra novo status imediatamente; reverte + feedback de erro se falhar
- Funciona no mobile (native `<select>` touch targets)
- Corresponde ao padrão existente de calls Supabase no codebase
- Confidence: HIGH — padrão estabelecido em HubSpot, Pipedrive, Close.io para listas de SDR

**Option B — Kanban board**
- Bom para gestor visualizando forma do pipeline; errado para SDR fazendo ligações
- Requer drag-and-drop lib, layout de 7 colunas responsivo, suporte touch
- Verdict: defer para v1.2 como view suplementar do gestor

**Ordenação dos status no dropdown:**

```
Novo
Contatado
Agendado
Compareceu
No-show
─────────
Comprou
Perdido
Sem interesse
```

Estados terminais visualmente separados. Cores dos tokens existentes em `globals.css`:
- `--status-good` → Comprou
- `--status-warning` → No-show, Agendado
- `--status-critical` → Perdido, Sem interesse
- `--ink-muted` → Novo, Contatado (neutros)

---

## Dashboard Integration Patterns

### O Desafio Core

O dashboard agrega `daily_entries` para agendamentos, comparecimentos e fechamentos. Os leads do CRM carregam a mesma informação via transições de status. Rodar ambos simultaneamente cria risco de double-counting.

### Padrão Recomendado: CRM como primário, Manual como fallback

**v1.1 launch:** Dashboard query AMBAS as fontes:
- CRM count = leads onde `status_updated_at` cai no range E status atingiu o estágio relevante
- Manual count = agregação existente de `daily_entries`
- Regra de display: se CRM leads existem para o período → mostrar CRM-derived counts com badge "via CRM". Se não há dados CRM (períodos pré-webhook) → fallback para manual com badge "via lançamento"
- Evita hard cutover que quebraria views históricas do dashboard

### Status-to-Metric Mapping

```
leads.status = 'agendado'     → agendamentos_count
leads.status = 'compareceu'   → atendimentos_count
leads.status = 'no_show'      → no_show_count
leads.status = 'comprou'      → closings_count
leads.status IN ('perdido',
  'sem_interesse')            → lost_count
```

### O Que Permanece Manual (Nunca Substituído pelo CRM)

- `revenue_amount` — CRM não sabe qual pacote de tratamento foi vendido ou o preço negociado
- `weekly_ad_metrics.investment` — Gestor insere do Meta Ads Manager; sem equivalente no CRM
- `daily_entries` históricos — manter para períodos pré-CRM

---

## Dependency Map

```
Tabela leads (nova)
  ├── status → counts do funil no dashboard
  ├── status_updated_at → filtro por período no dashboard
  └── created_at → "leads recebidos" no período

dashboard/page.tsx (existente, 291 linhas)
  → Nova query: leads por status + date range
  → CONCERNS.md flagou este arquivo para refactoring
  → Integração CRM é a forcing function para extrair hook ou migrar para Server Components
  → NÃO adicionar query do CRM inline ao monolith — extrair primeiro

daily_entries (existente)
  → revenue_amount: MANTER como source of truth
  → agendamentos/atendimentos/closings: SUBSTITUÍDOS pelo CRM quando leads table está populada
```

---

## Open Questions

1. Quais são os field names exatos do Meta Instant Form? A coluna `form_answers jsonb` lida com qualquer shape, mas a UI da lista precisa saber quais keys surfaçar como as 3 perguntas customizadas.
2. Gestor quer view read-only separada do CRM, ou a lista da SDR é suficiente para ambos?
3. Quando o lançamento manual de agendamentos/comparecimentos/fechamentos se torna opcional?

---

*Features research: 2026-07-09*
