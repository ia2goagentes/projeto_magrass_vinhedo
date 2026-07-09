# Architecture Research — v1.1 CRM Integration

**Confidence:** HIGH — verificado contra codebase existente + docs Next.js 16 instalados.

---

## Summary

O app é um monorepo Next.js 16 App Router single-tenant. Todas as páginas autenticadas vivem em `app/(app)/` como client components que query Supabase diretamente com o browser client. A única API Route existente é `app/auth/callback/route.ts` (GET). Não há server actions, data layer de API, nem state global.

A integração v1.1 requer: 1 nova API Route pública (webhook), 1 nova página autenticada (lista de leads), novos objetos Supabase (tabela + RLS + Postgres view), novos tipos, e expansão cirúrgica do dashboard. Nenhuma rota ou componente existente precisa ser removido.

**RISCO CRÍTICO:** O `config.matcher` do middleware NÃO exclui paths `/api/`. Um POST não-autenticado do Make para `/api/leads/ingest` vai atingir o middleware, receber `null` do `supabase.auth.getUser()`, e receber um redirect `302` para `/login` em vez do `201` esperado. O bypass do middleware deve ser o primeiro código commitado.

---

## New Files

| Path | Tipo | Propósito |
|------|------|-----------|
| `app/api/leads/ingest/route.ts` | API Route (POST) | Webhook público; valida `x-webhook-secret`, insere em `leads` via service role. Retorna `201`/`401`/`400`/`500` |
| `app/(app)/leads/page.tsx` | Page (client) | Lista de leads para SDR — busca `leads` ordenados por `created_at desc`, dropdown de status inline, upsert no change. Mesmo padrão de `lancamento/page.tsx` |
| `components/LeadStatusBadge.tsx` | Component | Renderiza `LeadStatus` como badge colorido usando tokens CSS existentes |
| `components/LeadTable.tsx` | Component | Tabela/card-list responsiva para leads (mesmo padrão de `DailyLogTable`) |
| `components/LeadFunnelCard.tsx` | Component | Card do dashboard mostrando count de leads por status no mês atual |
| `lib/supabase/service.ts` | Supabase client | Server-only. `createClient` com `SUPABASE_SERVICE_ROLE_KEY`. Apenas importado pela webhook route |

---

## Modified Files

| Path | O que Muda |
|------|-----------|
| `middleware.ts` | Adicionar `WEBHOOK_PATHS = ["/api/leads/ingest"]` no topo da função, antes de qualquer auth logic: early return `NextResponse.next()` |
| `lib/types.ts` | Adicionar `LeadStatus` union, `LEAD_STATUS_LABELS` record, tipo `Lead` |
| `components/Sidebar.tsx` | Adicionar entrada no array `LINKS`: `{ href: "/leads", label: "Leads", icon: UserCheck, roles: ["sdr", "gestor", "dona"] }` |
| `app/(app)/dashboard/page.tsx` | Estender `useEffect` estático (mount-only) para também buscar `lead_funnel_by_status`. Adicionar estado `leadCounts`. Passar para `LeadFunnelCard` |
| `supabase/schema.sql` | Adicionar: tabela `leads`, função `set_updated_at()`, trigger, RLS policies, view `lead_funnel_by_status` |

---

## Webhook Architecture

### Middleware bypass (PRIMEIRO change a fazer)

```typescript
// middleware.ts — adicionar no topo da função middleware, antes da criação do supabase client
const WEBHOOK_PATHS = ["/api/leads/ingest"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (WEBHOOK_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next({ request });
  }

  // ... resto do middleware existente sem alteração
}
```

### Segurança: header `x-webhook-secret`

```typescript
// app/api/leads/ingest/route.ts
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, whatsapp, answers } = body as Record<string, unknown>;
  if (typeof name !== "string" || typeof whatsapp !== "string") {
    return Response.json({ error: "Missing required fields: name, whatsapp" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({ name, whatsapp, answers: answers ?? {}, status: "novo" })
    .select("id")
    .single();

  if (error) return Response.json({ error: "DB error" }, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
```

### `lib/supabase/service.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

Client puro Node.js — sem cookies, sem sessão, sem `next/headers`. Seguro em qualquer contexto server-side. NUNCA importar em client components.

**Novas env vars:**
- `WEBHOOK_SECRET` — hex aleatório 32 chars; configurar no Make + `.env.local` + Vercel
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Settings → API (nunca expor ao browser)

---

## CRM → Dashboard Data Flow

### Decisão: Postgres view, não query direta na tabela

O `useEffect` do dashboard já dispara 3-5 queries em paralelo. A tabela `leads` vai crescer para centenas de rows/mês. Contar por status em JS após buscar todos os leads é desperdiçador. A view `lead_funnel_by_status` retorna no máximo 8 rows (um por status). RLS se propaga através de views não-`SECURITY DEFINER` no Supabase automaticamente.

### Data Flow

```
Make / Meta Instant Form
  → POST /api/leads/ingest (sem auth, header secret)
  → service role client (bypass RLS)
  → INSERT leads (status = 'novo')

SDR abre /leads (autenticado)
  → browser client com cookie session
  → SELECT leads (RLS: != 'pendente') → ordenado por created_at DESC
  → UPDATE leads SET status = $1, notes = $2 WHERE id = $3
    (RLS: current_role IN ('sdr', 'gestor'))

Dashboard monta (autenticado)
  → browser client com cookie session (useEffect estático existente)
  → SELECT status, count FROM lead_funnel_by_status (view, mês atual)
  → LeadFunnelCard renderiza count por status
```

---

## Supabase Schema

### Tabela `leads`

```sql
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  whatsapp    text not null,
  answers     jsonb not null default '{}'::jsonb,
  status      text not null default 'novo'
              check (status in (
                'novo', 'contatado', 'agendado',
                'compareceu', 'no_show',
                'comprou', 'perdido', 'sem_interesse'
              )),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

Status values em snake_case ASCII — sem caracteres acentuados em check constraints.

### Trigger `updated_at`

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

### RLS Policies

```sql
alter table public.leads enable row level security;

-- SELECT: qualquer autenticado não-pendente
create policy "leads_select_authenticated"
  on public.leads for select to authenticated
  using (public.current_role() != 'pendente');

-- INSERT: via service role apenas (Make usa service role key — bypass RLS automático)
-- Nenhuma insert policy para usuários autenticados necessária

-- UPDATE: SDR e gestor apenas
create policy "leads_update_sdr_gestor"
  on public.leads for update to authenticated
  using  (public.current_role() in ('sdr', 'gestor'))
  with check (public.current_role() in ('sdr', 'gestor'));
```

### View `lead_funnel_by_status`

```sql
create or replace view public.lead_funnel_by_status as
select
  status,
  count(*)::integer as lead_count
from public.leads
where created_at >= date_trunc('month', now())
group by status;
```

### TypeScript additions para `lib/types.ts`

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
  name: string;
  whatsapp: string;
  answers: Record<string, string>;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
```

---

## Suggested Build Order

**Step 1 — Schema Supabase** (sem deps de código)
Adicionar `leads`, trigger, RLS, view a `supabase/schema.sql` e rodar no SQL Editor. Adicionar `SUPABASE_SERVICE_ROLE_KEY` ao `.env.local` e Vercel.

**Step 2 — Types** (`lib/types.ts`)
Adicionar `LeadStatus`, `LEAD_STATUS_LABELS`, `Lead`. Mudança só-aditiva.

**Step 3 — Service client** (`lib/supabase/service.ts`)
Novo arquivo. Requerido pelo Step 5.

**Step 4 — Middleware bypass** (`middleware.ts`)
Deve ser commitado e deployado ANTES de testar o webhook com o Make end-to-end. Pode ser feito em paralelo com Steps 2–3.

**Step 5 — Webhook route** (`app/api/leads/ingest/route.ts`)
Requer Steps 1, 3, 4. Testar localmente com `curl` antes de conectar o Make.

**Step 6 — Lead list page** (`app/(app)/leads/page.tsx` + componentes + Sidebar)
Requer Steps 1, 2.

**Step 7 — Dashboard integration** (`dashboard/page.tsx` + `LeadFunnelCard`)
Requer Steps 1, 2. Último step por modificar o componente mais sensível.

**Step 8 — UX hardening** (forgot password, validação de formulário, confirmação de sobrescrita)
Nenhuma dependência dos Steps 1–7. Totalmente paralelizável.

### Dependency Graph

```
Step 1 (schema + env)
    ├── Step 2 (types)
    │     ├── Step 3 (service client)
    │     │     └── Step 5 (webhook route) ← também requer Step 4
    │     ├── Step 4 (middleware bypass) ← sem TS deps
    │     ├── Step 6 (leads page + sidebar)
    │     └── Step 7 (dashboard card)
    └── Step 8 (UX) — independente
```

---

## Integration Points Risk Table

| Integration Point | File | Risco | Por que |
|-------------------|------|-------|---------|
| Middleware bypass | `middleware.ts` | **CRÍTICO** | Sem isso, Make recebe `302` não `201`; falha silenciosa |
| Service client | `lib/supabase/service.ts` | Médio | Novo padrão não existente no codebase; não deve ser usado em client components |
| Webhook route | `app/api/leads/ingest/route.ts` | Baixo | Route Handler padrão, bem documentado |
| Dashboard static effect | `app/(app)/dashboard/page.tsx` | Médio | Adicionar query a 291-line monolith; risco de regressão |
| Leads page | `app/(app)/leads/page.tsx` | Baixo | Segue padrão idêntico ao `lancamento/page.tsx` |

---

## Open Questions

- `/leads` deve ser bloqueado no middleware para `convidado`? Atualmente não restrito — um `convidado` que adivinhar a URL vê a página mas não pode atualizar (RLS bloqueia writes).
- SDR deve receber notificação de browser quando novo lead chegar? Supabase Realtime suporta isso facilmente, mas não está no escopo v1.1 como especificado.
- `SUPABASE_SERVICE_ROLE_KEY` deve ser adicionado ao Vercel antes de deployar o webhook em produção — dependência de ops fora do codebase.

---

*Architecture research: 2026-07-09*
