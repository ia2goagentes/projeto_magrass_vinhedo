# Stack Research — v1.1 Lead CRM + Webhook

**Confidence:** HIGH — verified against locally installed packages and existing codebase patterns.

---

## Summary

**Zero new npm packages needed.** Toda a capacidade para o milestone v1.1 já está instalada. As adições são: 2 novas env vars, 1 novo helper file (admin client), 1 nova API Route, 1 nova tabela Supabase, e componentes UI construídos com primitivos existentes.

---

## New Dependencies

| Candidate | Decision | Reason |
|-----------|----------|--------|
| Webhook parsing lib (`svix`, `standardwebhooks`) | Skip | `request.headers.get('x-webhook-secret')` é Web API nativo em Next.js 16 Route Handlers |
| `zod` | Skip v1.1 | Payload do Make é controlado e conhecido; inline extraction com nullish fallbacks é suficiente |
| `swr` / `react-query` | Skip | Supabase Realtime (já bundled) cobre push updates; polling adiciona latência desnecessária |
| `@supabase/realtime-js` | Já presente | Bundled dentro do `@supabase/supabase-js` 2.110.1 já instalado |
| `react-hot-toast` / `sonner` | Skip | Banner `useState` + ícone `Bell` do lucide-react é suficiente para notificação da SDR |
| `@tanstack/react-table` | Skip | Volume < 500 leads/mês; `<table>` plain com sort/filter inline é suficiente |

---

## Webhook Security Pattern

**Abordagem:** Secret compartilhado em header `x-webhook-secret`, comparado server-side antes de qualquer escrita no DB. `process.env.WEBHOOK_SECRET` — sem prefixo `NEXT_PUBLIC_`.

**Arquivo:** `app/api/leads/ingest/route.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const incomingSecret = request.headers.get('x-webhook-secret')
  if (incomingSecret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { error } = await supabase.from('leads').insert({ /* mapped fields */ })
  if (error) return NextResponse.json({ error: 'DB error' }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

**Por que header, não query param:** Query params aparecem em logs de servidor e CDN; headers não. Para endpoints que ingerem PII (nome, WhatsApp), headers são estritamente melhores.

**Novo arquivo:** `lib/supabase/admin.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

**Novas env vars:**
- `WEBHOOK_SECRET` — string hex aleatória de 32 chars; configurar no Make + `.env.local` + plataforma de hosting
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Settings → API (server-only, nunca expor ao browser)

---

## Supabase Changes

### Nova tabela: `leads`

```sql
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  whatsapp     text not null,
  form_answers jsonb,
  status       text not null default 'novo'
               check (status in (
                 'novo', 'contatado', 'agendado',
                 'compareceu', 'no_show',
                 'comprou', 'perdido', 'sem_interesse'
               )),
  notes        text,
  source       text default 'make_webhook',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

`form_answers` como JSONB porque as perguntas do formulário Meta variam por campanha — evita migrações de schema quando as perguntas mudam.

### Trigger `updated_at`

```sql
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.update_updated_at();
```

### RLS Policies

```sql
alter table public.leads enable row level security;

-- Todos os autenticados podem ler
create policy "leads_select_authenticated" on public.leads
  for select to authenticated using (true);

-- SDR e gestor podem inserir (entrada manual; webhook usa service-role, bypass RLS)
create policy "leads_insert_sdr_gestor" on public.leads
  for insert to authenticated
  with check (public.current_role() in ('sdr', 'gestor'));

-- SDR e gestor podem atualizar status + notes
create policy "leads_update_sdr_gestor" on public.leads
  for update to authenticated
  using (public.current_role() in ('sdr', 'gestor'))
  with check (public.current_role() in ('sdr', 'gestor'));
```

O service-role client usado pelo webhook sempre bypass RLS — nenhuma policy separada para webhook é necessária.

### Habilitar Realtime

```sql
alter publication supabase_realtime add table public.leads;
```

### Hook de notificação em tempo real

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNewLeads() {
  const [hasNew, setHasNew] = useState(false)
  const supabase = createClient()
  useEffect(() => {
    const channel = supabase
      .channel('leads-notifications')
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'leads' },
          () => setHasNew(true))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])
  return { hasNew, clear: () => setHasNew(false) }
}
```

---

## What NOT to Add

| Candidate | Decision | Reasoning |
|-----------|----------|-----------|
| Supabase Edge Function | Skip | KEY DECISION em PROJECT.md: mesma repo, mesmo deploy, sem cold-start de Edge Function separada |
| `zod` | Skip | Uso isolado quebra consistência; adicionar projeto-todo se adotado amplamente |
| Toast library | Skip | Bell icon + banner `useState` cobre notificação SDR neste escopo |
| `@tanstack/react-table` | Skip | < 500 rows/mês; table plain + sort state é suficiente |
| WhatsApp API / messaging | Skip | Explicitamente out of scope em PROJECT.md |
| ORM (Prisma/Drizzle) | Skip | Todas as queries existentes usam Supabase JS client raw; introduzir para uma tabela quebra o padrão estabelecido |

---

*Stack research: 2026-07-09*
