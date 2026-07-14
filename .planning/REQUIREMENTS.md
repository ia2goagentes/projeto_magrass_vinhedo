# Requirements — v1.1 Lead Pipeline + Dashboard Upgrade

**Milestone:** v1.1
**Status:** Active
**Last updated:** 2026-07-09

---

## Active Requirements

### Lead Ingestion (INGST)

- [x] **INGST-01**: Sistema aceita POST no endpoint `/api/leads/ingest` com header `x-webhook-secret` e insere lead na tabela `leads` (inclui middleware bypass e service-role client)
- [x] **INGST-02**: Lead duplicado (mesmo `lead_source_id` do Meta) é silenciosamente ignorado — Make pode fazer retry sem criar duplicatas
- [x] **INGST-03**: Número de WhatsApp é normalizado para apenas dígitos no momento da ingestão
- [x] **INGST-04**: Respostas do formulário Meta são armazenadas como JSONB sem colunas fixas por pergunta

### CRM de Leads (CRM)

- [ ] **CRM-01**: SDR pode ver lista de todos os leads com nome, WhatsApp (como link wa.me), status e data — acessível em `/leads`
- [ ] **CRM-02**: SDR pode filtrar leads por status via abas (Todos / Novo / Contatado / Agendado / Compareceu / No-show / Comprou / Perdido / Sem interesse)
- [ ] **CRM-03**: SDR pode atualizar o status de um lead diretamente na lista via dropdown inline, com atualização otimista na tela
- [ ] **CRM-04**: SDR pode registrar e atualizar uma nota por lead
- [ ] **CRM-05**: SDR recebe notificação in-app (toast) quando um novo lead chega enquanto a página `/leads` está aberta

### Dashboard Integration (DASH)

- [ ] **DASH-01**: Dashboard exibe agendamentos, comparecimentos e fechamentos derivados dos status dos leads do CRM para períodos após o go-live do webhook
- [ ] **DASH-02**: Dashboard mantém dados do `daily_entries` como fonte de fallback para períodos históricos (pré-webhook)
- [ ] **DASH-03**: Dashboard inclui card com count de leads por status (mês atual)
- [ ] **DASH-04**: Sparklines de CPL, CPA, CAC e ROAS exibem variação real por período (bug de linha reta corrigido)

### Dashboard Visual (UI)

- [ ] **UI-01**: Cards do dashboard exibem skeleton loading animado durante carregamento (substituindo "Carregando...")
- [ ] **UI-02**: Cards de métricas têm design moderno com tipografia, espaçamento e hierarquia visual melhorados
- [ ] **UI-03**: Gráfico de funil exibe percentuais claramente legíveis
- [ ] **UI-04**: Lógica de dados do dashboard é extraída para hooks reutilizáveis (refatoração do monolito de 291 linhas)

### UX Fixes (UX)

- [ ] **UX-01**: Usuário pode recuperar senha via `/forgot-password` (email de reset enviado pelo Supabase)
- [ ] **UX-02**: Formulário de lançamento exibe "Atualizar lançamento" e aviso de sobrescrita quando entrada do dia já existe
- [x] **UX-03**: ~~Formulário de lançamento valida que atendimentos + no-shows + reagendados não excedem agendamentos~~ — **cancelado**: os números de um mesmo dia são coortes diferentes (quem comparece hoje foi agendado dias antes), então a soma legitimamente excede os agendamentos do dia. Validação removida.
- [ ] **UX-04**: Ícone do ThemeToggle inicializa no estado correto (sem flash ao carregar)

---

## Future Requirements

- Link WhatsApp direto na lista de leads (wa.me) — simples mas não table stake
- Notificação de email para gestor quando novo usuário registra
- Exportação de dados para CSV/Excel
- Badge de count por status na sidebar/header

---

## Out of Scope

- **Kanban de leads** — errado para workflow de SDR fazendo ligações em série; visão do gestor para v1.2
- **WhatsApp Business API** — requer Meta Business Account verificado, BSP pago, semanas de setup; link wa.me é suficiente
- **Lead scoring / qualificação IA** — sem training data suficiente; < 500 leads/mês
- **Multi-tenancy (multi-clínica)** — arquitetura single-tenant; migração é grande demais para este milestone
- **Integração de calendário** — clínica usa sistema de agendamento separado; status "Agendado" é suficiente
- **Deleção de leads** — leads são arquivados via status (Perdido/Sem interesse), nunca deletados

---

## Traceability

| REQ-ID | Fase |
|--------|------|
| INGST-01 | Phase 1 |
| INGST-02 | Phase 1 |
| INGST-03 | Phase 1 |
| INGST-04 | Phase 1 |
| CRM-01 | Phase 3 |
| CRM-02 | Phase 3 |
| CRM-03 | Phase 3 |
| CRM-04 | Phase 3 |
| CRM-05 | Phase 3 |
| DASH-01 | Phase 2 |
| DASH-02 | Phase 2 |
| DASH-03 | Phase 2 |
| DASH-04 | Phase 2 |
| UI-01 | Phase 2 |
| UI-02 | Phase 2 |
| UI-03 | Phase 2 |
| UI-04 | Phase 2 |
| UX-01 | Phase 4 |
| UX-02 | Phase 4 |
| UX-03 | Phase 4 |
| UX-04 | Phase 4 |
