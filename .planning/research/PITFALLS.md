# Domain Pitfalls: Lead CRM + Webhook on Existing Next.js + Supabase Dashboard

**Sistema:** Clínica Magras Vinhedo — Next.js 16 + Supabase + Tailwind v4
**Researched:** 2026-07-09
**Confidence:** HIGH — baseado em schema.sql e CONCERNS.md reais

---

## Summary

Seis clusters de pitfalls emergem ao enxertar um CRM com webhook público neste codebase específico.

**Os dois mais perigosos:**
1. **Gap de RLS:** O anon role do Supabase não satisfaz políticas `to authenticated`, então o webhook DEVE usar um service-role client — não o client anon padrão. Errar isso produz falha silenciosa de insert (Make acha que funcionou, dado nunca chega) ou tabela aberta catastroficamente.
2. **Poluição de métricas:** `daily_entries` atualmente possui `leads_count`, `appointments_count`, `attendances_count`, `closings_count`. Uma vez que o CRM derive esses mesmos valores dos status de `leads`, o dashboard vai double-count a menos que a equipe declare uma fonte autoritativa por métrica antes de escrever qualquer query.

O restante — replay attacks, leads duplicados, race conditions da SDR — é real mas recuperável em produção se descoberto cedo.

---

## Webhook Pitfalls

### PITFALL-W1: Secret com `===` em vez de `timingSafeEqual` — Severity: MEDIUM

**O que dá errado:** Comparação de string simples é vulnerável a timing side-channel. Mais praticamente: o secret pode aparecer em logs se mensagens de erro não forem filtradas.

**Prevenção:**
```typescript
import { timingSafeEqual } from "crypto";

const provided = Buffer.from(req.headers["x-webhook-secret"] ?? "", "utf8");
const expected = Buffer.from(process.env.WEBHOOK_SECRET ?? "", "utf8");
if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```
Nunca logar o valor raw do secret. Logar apenas `"secret_present": true/false`.

---

### PITFALL-W2: Sem Idempotency Key — Retries do Make Criam Leads Duplicados — Severity: HIGH

**O que dá errado:** Make faz retry em timeout de rede ou resposta non-2xx. Cada retry é um POST independente com payload idêntico. A tabela `leads` recebe duas ou mais rows para a mesma submissão de formulário.

**Por que acontece:** O módulo HTTP do Make faz retry em erros de rede e 5xx. Se o Supabase está lento e o Make já marcou o request como timeout e fez retry, o insert original também pode ter sucesso — dois inserts para um lead.

**Prevenção:** Meta Instant Forms fornecem um `lead_id` estável por submissão. Usar `ON CONFLICT (lead_source_id) DO NOTHING`:

```sql
-- Na DDL de leads:
lead_source_id text unique  -- Meta lead_id; previne inserts duplicados
```

```typescript
// Endpoint: upsert com ignoreDuplicates
const { error } = await supabaseAdmin
  .from("leads")
  .upsert(
    { ...payload, lead_source_id: body.lead_id },
    { onConflict: "lead_source_id", ignoreDuplicates: true }
  );
// Retornar 200 mesmo para duplicatas — Make não deve fazer retry
```

---

### PITFALL-W3: Client Anon Não Satisfaz Políticas `to authenticated` — Severity: HIGH (mais perigoso)

**O que dá errado:** O webhook não é chamado por um usuário logado. Se o endpoint usa `createClient(url, anonKey)`, o Supabase avalia RLS como role `anon`. Todas as políticas de write existentes usam `to authenticated` — o role anon não bate, então o insert é silenciosamente rejeitado. Make recebe 200 (se a route suprime o erro do Supabase). Dados desaparecem sem alerta.

**Por que este sistema é especificamente em risco:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` é a chave client-side. Adicionar uma insert policy `to anon` abriria a tabela a qualquer chamador com a anon key — que está exposta no browser bundle conforme CONCERNS.md.

**Prevenção:** Usar service-role key no API route. O service role bypass RLS completamente. A validação do secret no route é o substituto para autenticação de usuário.

```typescript
// app/api/leads/ingest/route.ts — SERVER ONLY
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // SEM NEXT_PUBLIC_ — nunca no browser bundle
);
```

---

### PITFALL-W4: Webhook Route Não Excluída do Auth Middleware — Severity: MEDIUM

**O que dá errado:** Se `/api/leads/ingest` não é explicitamente excluída dos checks de auth, o middleware pode redirecionar o POST do Make para `/login`, retornando uma resposta HTML 3xx que o Make não consegue lidar — falha permanente.

**Prevenção:** Excluir explicitamente na config do matcher:
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/leads/ingest).*)"],
};
```

---

### PITFALL-W5: Sem Validação de Schema do Body — Payload Malformado Chega ao Banco — Severity: MEDIUM

**O que dá errado:** Se uma campanha Meta é retrabalhada com perguntas diferentes, o webhook recebe payload com campos renomeados. Sem validação, o route insere valores null silenciosamente ou lança exception não-tratada retornando 500 — causando retry do Make (agravando W2).

**Prevenção:** Validar campos obrigatórios antes do insert, retornar 422 (não 500) para erros de schema. Make não faz retry em 4xx:
```typescript
const missing = ["name", "phone"].filter((k) => !body[k]);
if (missing.length > 0) {
  return Response.json({ error: "Missing fields", missing }, { status: 422 });
}
```

---

### PITFALL-W6: Sem Janela de Replay Attack — Severity: LOW

**Risco atual:** BAIXO. Make chama via HTTPS de Vercel com IPs fixos. Secret estático é suficiente para v1.1. Documentar a decisão em PROJECT.md.

---

## CRM Data Quality Pitfalls

### PITFALL-D1: Atualizações de Status Sem Audit Trail — Severity: MEDIUM

**O que dá errado:** Um lead que vai de `Agendado` para `Novo` (correção de erro) muda retroativamente os counts do dashboard sem registro de quem mudou ou quando. 

**Prevenção:** Adicionar `status_updated_at timestamptz` e `status_history jsonb[]` no schema inicial — custo zero na DDL, impossível adicionar retroativamente sem dados perdidos.

---

### PITFALL-D2: Inconsistência de Formato de WhatsApp Quebra Deduplicação — Severity: MEDIUM

**O que dá errado:** Meta envia números em formatos variados (`+5511999999999`, `5511999999999`, `11999999999`). Deduplicação por número falha porque a comparação de string trata como valores diferentes.

**Prevenção:** Normalizar no ingest:
```typescript
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, ""); // remove tudo que não for dígito
}
```

---

### PITFALL-D3: Perguntas do Formulário Meta São Específicas da Campanha — Severity: MEDIUM

**O que dá errado:** Se armazenadas como `answer_1 text, answer_2 text, answer_3 text`, uma nova campanha com perguntas diferentes exige migração de schema.

**Prevenção:** Usar `jsonb` para respostas customizadas:
```sql
form_answers jsonb not null default '{}'::jsonb,
raw_payload  jsonb not null default '{}'::jsonb  -- payload bruto do Make para debugging
```

---

## Dashboard Integration Pitfalls

### PITFALL-I1: Conflito de Autoridade de Métrica — `daily_entries` e `leads` Possuem as Mesmas Métricas — Severity: HIGH

**O que dá errado:** `daily_entries` atualmente tem `leads_count`, `appointments_count`, `attendances_count`, `closings_count`. Se o dashboard soma CRM + manual entries, todas as métricas do funil dobram.

**Prevenção — decisão de autoridade obrigatória antes de qualquer query:**

| Métrica | Autoridade v1.1 | Fonte |
|---------|----------------|-------|
| `leads_count` | tabela `leads` | `COUNT(*) WHERE DATE(created_at) = date` |
| `appointments_count` | tabela `leads` | `COUNT(*) WHERE status = 'Agendado'` |
| `attendances_count` | tabela `leads` | `COUNT(*) WHERE status IN ('Compareceu', 'Comprou')` |
| `closings_count` | tabela `leads` | `COUNT(*) WHERE status = 'Comprou'` |
| `no_shows_count` | tabela `leads` | `COUNT(*) WHERE status = 'No-show'` |
| `revenue_amount` | `daily_entries` | Entrada manual SDR — sem equivalente no CRM |
| `investment_amount` | `weekly_ad_metrics` | Entrada manual gestor — sem equivalente no CRM |

Documentar essa tabela em PROJECT.md como Key Decision antes de qualquer fase começar.

---

### PITFALL-I2: Métricas CRM Atribuídas por Data Diferente de `daily_entries` — Severity: MEDIUM

**O que dá errado:** `daily_entries` agrega por `entry_date` (hoje). `leads.created_at` é quando o webhook dispara. Status é atualizado em um dia diferente de quando o lead chegou.

**Prevenção — estratégia de atribuição de data:**
- **Opção A (recomendada):** Atribuir todas as métricas ao `created_at` — dia que o lead chegou. Responde: "dos leads desta semana, quantos agendaram?"
- **Opção B:** Armazenar `status_updated_at` por transição. Mais complexo. Requer `status_history`.

Opção A é correta e mais simples para as necessidades desta clínica.

---

### PITFALL-I3: Adicionar Quinta Fonte de Dados ao Monolith de 291 Linhas — Severity: MEDIUM

**O que dá errado:** Adicionar query de `leads` dentro do mesmo `useEffect` monolítico significa: todas as 5 queries se bloqueiam mutuamente; query lenta de leads (sem índice, tabela crescendo) atrasa o dashboard todo.

**Prevenção:** NÃO adicionar query de leads ao `useEffect` existente. Extrair hook `useLeadMetrics(dateRange)` que retorna counts do CRM independentemente com seu próprio loading state.

---

### PITFALL-I4: `computeFunnelMetrics` Recebe Investimento Errado — Severity: LOW

**O que dá errado:** CONCERNS.md já flagou que `computeFunnelMetrics(bucket.agg, weeklyAgg)` passa o `weeklyAgg` do período todo para cada bucket, produzindo sparklines planas. Com leads do CRM, o bug fica visivelmente pior.

**Prevenção:** Corrigir o bug das sparklines junto com a integração CRM, não depois.

---

## Supabase RLS Pitfalls

### PITFALL-R1: `to authenticated` Não Funciona para INSERT do Webhook — Severity: HIGH

**Design correto de RLS para a tabela `leads`:**

```sql
-- Leitura: apenas SDR e gestor (dona vê apenas agregados no dashboard)
CREATE POLICY "leads_select_sdr_gestor"
  ON public.leads FOR SELECT TO authenticated
  USING (public.current_role() IN ('sdr', 'gestor'));

-- Update: SDR e gestor
CREATE POLICY "leads_update_sdr_gestor"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.current_role() IN ('sdr', 'gestor'))
  WITH CHECK (public.current_role() IN ('sdr', 'gestor'));

-- INSERT: NENHUMA POLICY — webhook usa service-role key que faz bypass de RLS.
-- Intencional. O service-role key + webhook secret é o mecanismo de auth.
```

---

### PITFALL-R2: `public.current_role()` Retorna NULL para Inserts via Service-Role — Severity: MEDIUM

**Prevenção:** Nunca depender de `public.current_role()` em triggers da tabela `leads`. Definir proveniência explicitamente no webhook:
```typescript
await supabaseAdmin.from("leads").insert({
  ...payload,
  source: "webhook",  // string literal, não UUID
});
```

---

### PITFALL-R3: Role `dona` Tem Acesso de Leitura Irrestrito a PII dos Leads — Severity: MEDIUM

**O que dá errado:** `daily_entries` continha apenas contagens agregadas — sem PII. A tabela `leads` muda isso completamente: contém nomes de pacientes, WhatsApp e respostas de formulário de saúde. Acesso irrestrito da `dona` é uma questão de LGPD.

**Prevenção:**
1. Restringir `leads_select` para `sdr` e `gestor` apenas (acima).
2. Adicionar `dona` à matriz de paths do middleware para bloquear `/leads` — a recomendação do CONCERNS.md agora é obrigatória dado o PII.

---

### PITFALL-R4: Sem DELETE Policy Explícita em `leads` — Severity: LOW

**Prevenção:** Adicionar comentário no schema:
```sql
-- Sem DELETE policy em public.leads.
-- Leads nunca são deletados. Usar status = 'Perdido' ou 'Sem interesse' para arquivar.
-- Deleção administrativa (LGPD) requer acesso direto ao banco.
```

---

## UX / SDR Workflow Pitfalls

### PITFALL-U1: Sem Optimistic UI — SDR Clica e Espera — Severity: MEDIUM

**Prevenção:** Aplicar optimistic updates. No clique, atualizar estado local imediatamente para o novo status, disparar Supabase UPDATE em background, e reverter no erro com feedback.

---

### PITFALL-U2: Two Tabs Causam Last-Write-Wins Silencioso — Severity: LOW (hoje), MEDIUM (se time crescer)

**Prevenção:** Adicionar concorrência otimista usando `updated_at`:
```typescript
const { count } = await supabase
  .from("leads")
  .update({ status: newStatus })
  .eq("id", leadId)
  .eq("updated_at", knownUpdatedAt)  // só atualiza se não mudou
  .select("*", { count: "exact", head: true });

if (count === 0) { /* Mostrar "Lead modificado por outra sessão. Recarregue." */ }
```

---

### PITFALL-U3: Sem Filtro na Lista — Inutilizável Após 100+ Leads — Severity: MEDIUM

**Prevenção:** Construir a lista de leads com abas de filtro por status (`Todos | Novo | Contatado | Agendado | ...`) desde o primeiro dia. São simples adições de cláusula WHERE — mais difícil de retrofitar depois.

---

### PITFALL-U4: SDR Sem Notificação em Tempo Real de Novo Lead — Severity: MEDIUM

**O que dá errado:** O webhook insere o lead, mas a SDR só vê quando atualiza manualmente a página CRM. O fluxo Make existente envia email; sem equivalente in-app, o tempo de primeira resposta degrada.

**Prevenção:** Adicionar Supabase Realtime subscription na página CRM. Mostrar toast quando novo lead `Novo` é inserido enquanto a página está aberta. Sem nova dependência — Supabase Realtime já está disponível no plano.

---

### PITFALL-U5: Sem Confirmação Antes de Status Terminal — Severity: LOW

**Prevenção:** Para status terminais (`Comprou`, `Perdido`, `Sem interesse`), mostrar confirmação single-click inline: "Marcar como Comprou — aparecerá no dashboard. Confirmar?"

---

## Which Phase Should Address Each Pitfall

| Pitfall | Fase | Razão |
|---------|------|-------|
| Service-role key para webhook (W3, R1) | Fase 1: Webhook | Bloqueante — sem isso nenhum dado chega |
| Idempotency key no DDL (W2) | Fase 1: Webhook | Decisão de schema — deve estar no DDL inicial |
| `timingSafeEqual` (W1) | Fase 1: Webhook | Segurança — mesmo PR do endpoint |
| Exclusão do middleware (W4) | Fase 1: Webhook | Quebra silenciosamente a integração Make |
| Validação de schema do body (W5) | Fase 1: Webhook | Previne retry storms do Make |
| Normalização de telefone (D2) | Fase 1: Webhook | Normalizar no ingest — impossível retroativamente |
| `jsonb` para respostas do formulário (D3) | Fase 1: Webhook | Decisão de schema — mudar tipo de coluna depois requer migração |
| Design de RLS (R1, R2) | Fase 1: Webhook | Schema deve estar correto antes de qualquer dado chegar |
| Restrição de PII para `dona` (R3) | Fase 1: Webhook | PII chega na Fase 1; restrição deve existir no primeiro deploy |
| Comentário explícito sem DELETE (R4) | Fase 1: Webhook | Documentação de schema — custo zero na DDL |
| Decisão de autoridade de métrica (I1) | Fase 2: Dashboard | Deve ser comprometida antes de qualquer query de dashboard |
| Estratégia de atribuição de data (I2) | Fase 2: Dashboard | Determina como SQL do dashboard agrupa dados CRM |
| Hook `useLeadMetrics` (não monolith) (I3) | Fase 2: Dashboard | Limite arquitetural — adicionar junto com hooks existentes |
| Bug das sparklines (I4) | Fase 2: Dashboard | Fica visivelmente pior com dados CRM reais |
| Coluna `status_history jsonb` (D1) | Fase 2: Dashboard | Adicionar antes das atualizações de status irem ao ar |
| Optimistic UI (U1) | Fase 3: CRM UI | Implementar na lista inicial, não como follow-up |
| Filtros de status na lista (U3) | Fase 3: CRM UI | Construir com a lista inicial — retrofitar UI state é mais difícil que retrofitar SQL |
| Supabase Realtime para novos leads (U4) | Fase 3: CRM UI | Encaixa naturalmente com a subscription da lista |
| Dialog de confirmação de status terminal (U5) | Fase 3: CRM UI | Mesma fase que o componente de status picker |
| Concorrência otimista `updated_at` (U2) | Fase 3: CRM UI | Adicionar quando a mutation de status update é construída |
| Janela de replay attack (W6) | Pós v1.1 | Baixo risco com HTTPS + Vercel; documentar como decisão diferida |

---

*Pitfalls research: 2026-07-09*
