-- Dashboard de Funil — Clínica Magras
-- Rode este arquivo inteiro no SQL Editor do Supabase (projeto novo, vazio).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('pendente', 'sdr', 'dona', 'gestor', 'convidado')),
  created_at timestamptz not null default now()
);

-- daily_entries: preenchida pela SDR, todo dia — só o que ela acompanha
-- operacionalmente. Investimento saiu daqui (ver weekly_ad_metrics).
create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null unique,
  leads_count integer not null default 0,
  appointments_count integer not null default 0,
  attendances_count integer not null default 0,
  no_shows_count integer not null default 0,
  closings_count integer not null default 0,
  revenue_amount numeric(12, 2) not null default 0,
  filled_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Se a tabela já existia numa versão anterior (com investment_amount e sem
-- rescheduled_count), ajusta sem perder o resto dos dados.
alter table public.daily_entries drop column if exists investment_amount;
alter table public.daily_entries add column if not exists rescheduled_count integer not null default 0;

-- weekly_ad_metrics: preenchida pelo gestor de tráfego, uma vez por semana
-- (toda segunda, com os dados de segunda a domingo anteriores).
create table if not exists public.weekly_ad_metrics (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique, -- sempre uma segunda-feira
  investment_amount numeric(12, 2) not null default 0,
  impressions_count integer not null default 0,
  reach_count integer not null default 0,
  reported_leads_count integer not null default 0, -- leads mostrados no painel do Meta Ads (referência, não entra no CPL/CAC)
  notes text,
  filled_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- daily_ad_metrics: preenchida automaticamente 1x/dia pelo cron de sincronização
-- com a API da Meta (ver app/api/cron/sync-meta-ads). weekly_ad_metrics
-- continua existindo só como reserva manual, caso precise corrigir algo.
create table if not exists public.daily_ad_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null unique,
  investment_amount numeric(12, 2) not null default 0,
  impressions_count integer not null default 0,
  reach_count integer not null default 0,
  reported_leads_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.daily_ad_metrics enable row level security;

drop policy if exists "daily_ad_metrics_select_all" on public.daily_ad_metrics;
create policy "daily_ad_metrics_select_all"
  on public.daily_ad_metrics for select to authenticated
  using (true);

-- Sem policy de insert/update: só o cron (service role) escreve aqui.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null unique,
  target_value numeric,
  direction text not null default 'higher_is_better'
    check (direction in ('higher_is_better', 'lower_is_better')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Se a tabela já existia (projeto rodado antes desta versão), garante que o
-- 'pendente' está liberado no cargo.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pendente', 'sdr', 'dona', 'gestor', 'convidado'));

insert into public.goals (metric_key, direction) values
  ('cpl', 'lower_is_better'),
  ('cpa', 'lower_is_better'),
  ('lead_to_appointment_rate', 'higher_is_better'),
  ('attendance_rate', 'higher_is_better'),
  ('no_show_rate', 'lower_is_better'),
  ('rescheduled_rate', 'lower_is_better'),
  ('attendance_to_closing_rate', 'higher_is_better'),
  ('lead_to_closing_rate', 'higher_is_better'),
  ('avg_ticket', 'higher_is_better'),
  ('cac', 'lower_is_better'),
  ('roas', 'higher_is_better'),
  ('monthly_closings_target', 'higher_is_better')
on conflict (metric_key) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: papel do usuário logado, sem recursão de RLS (security definer).
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Cadastro (email + senha): cria a profile automaticamente como 'pendente'
-- assim que a pessoa se registra. O gestor define o cargo real depois, na
-- tela /usuarios.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'pendente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.daily_entries enable row level security;
alter table public.weekly_ad_metrics enable row level security;
alter table public.goals enable row level security;

-- profiles: cada um lê a própria linha; gestor lê todas.
drop policy if exists "profiles_select_own_or_gestor" on public.profiles;
create policy "profiles_select_own_or_gestor"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.current_role() = 'gestor');

-- profiles: só gestor pode mudar o cargo (ou dados) de alguém.
-- Inserção não tem policy — só acontece via trigger (security definer).
drop policy if exists "profiles_update_gestor" on public.profiles;
create policy "profiles_update_gestor"
  on public.profiles for update
  to authenticated
  using (public.current_role() = 'gestor')
  with check (public.current_role() = 'gestor');

-- daily_entries: leitura livre pra qualquer usuário autenticado (com profile).
drop policy if exists "daily_entries_select_all" on public.daily_entries;
create policy "daily_entries_select_all"
  on public.daily_entries for select
  to authenticated
  using (true);

drop policy if exists "daily_entries_write_sdr_gestor" on public.daily_entries;
create policy "daily_entries_write_sdr_gestor"
  on public.daily_entries for insert
  to authenticated
  with check (public.current_role() in ('sdr', 'gestor'));

drop policy if exists "daily_entries_update_sdr_gestor" on public.daily_entries;
create policy "daily_entries_update_sdr_gestor"
  on public.daily_entries for update
  to authenticated
  using (public.current_role() in ('sdr', 'gestor'))
  with check (public.current_role() in ('sdr', 'gestor'));

-- weekly_ad_metrics: leitura livre; escrita só gestor (é quem lança os
-- dados de tráfego pago, toda segunda-feira).
drop policy if exists "weekly_ad_metrics_select_all" on public.weekly_ad_metrics;
create policy "weekly_ad_metrics_select_all"
  on public.weekly_ad_metrics for select
  to authenticated
  using (true);

drop policy if exists "weekly_ad_metrics_write_gestor" on public.weekly_ad_metrics;
create policy "weekly_ad_metrics_write_gestor"
  on public.weekly_ad_metrics for insert
  to authenticated
  with check (public.current_role() = 'gestor');

drop policy if exists "weekly_ad_metrics_update_gestor" on public.weekly_ad_metrics;
create policy "weekly_ad_metrics_update_gestor"
  on public.weekly_ad_metrics for update
  to authenticated
  using (public.current_role() = 'gestor')
  with check (public.current_role() = 'gestor');

-- goals: leitura livre; escrita só gestor.
drop policy if exists "goals_select_all" on public.goals;
create policy "goals_select_all"
  on public.goals for select
  to authenticated
  using (true);

drop policy if exists "goals_update_gestor" on public.goals;
create policy "goals_update_gestor"
  on public.goals for update
  to authenticated
  using (public.current_role() = 'gestor')
  with check (public.current_role() = 'gestor');

drop policy if exists "goals_insert_gestor" on public.goals;
create policy "goals_insert_gestor"
  on public.goals for insert
  to authenticated
  with check (public.current_role() = 'gestor');

-- ---------------------------------------------------------------------------
-- Bootstrap do primeiro gestor (rode manualmente uma única vez, ver DEPLOY.md):
--
-- 1. Crie sua conta normalmente em /signup (fica como 'pendente').
-- 2. Rode:
--    update public.profiles set role = 'gestor' where email = 'voce@exemplo.com';
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Phase 1: Lead Ingestion (v1.1)
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  lead_source_id    text unique,
  name              text not null,
  whatsapp          text not null,
  form_answers      jsonb not null default '{}',
  raw_payload       jsonb not null default '{}',
  status            text not null default 'novo'
                    check (status in (
                      'novo', 'contatado', 'agendado',
                      'compareceu', 'no_show',
                      'comprou', 'perdido', 'sem_interesse'
                    )),
  notes             text,
  status_updated_at timestamptz,
  source            text not null default 'make_webhook',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- CRM-02: mais contexto no lead + agendamento direto no card.
alter table public.leads add column if not exists origin text;
alter table public.leads add column if not exists procedure_interest text;
alter table public.leads add column if not exists tags text[] not null default '{}';
alter table public.leads add column if not exists scheduled_at timestamptz;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "leads_select_sdr_gestor" on public.leads;
create policy "leads_select_sdr_gestor"
  on public.leads for select to authenticated
  using (public.current_role() in ('sdr', 'gestor'));

drop policy if exists "leads_update_sdr_gestor" on public.leads;
create policy "leads_update_sdr_gestor"
  on public.leads for update to authenticated
  using (public.current_role() in ('sdr', 'gestor'))
  with check (public.current_role() in ('sdr', 'gestor'));

drop policy if exists "leads_insert_sdr_gestor" on public.leads;
create policy "leads_insert_sdr_gestor"
  on public.leads for insert to authenticated
  with check (public.current_role() in ('sdr', 'gestor'));

-- Leads também podem entrar via webhook (service-role, bypassa RLS).
-- No DELETE policy — leads são arquivados via status, nunca apagados.

create or replace view public.lead_funnel_by_status as
select
  status,
  count(*)::integer as lead_count
from public.leads
where created_at >= date_trunc('month', now())
group by status;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;
end;
$$;
