export type Role = "pendente" | "sdr" | "dona" | "gestor" | "convidado";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
};

export type DailyEntry = {
  id: string;
  entry_date: string;
  leads_count: number;
  appointments_count: number;
  attendances_count: number;
  no_shows_count: number;
  rescheduled_count: number;
  closings_count: number;
  revenue_amount: number;
  filled_by: string | null;
  updated_at: string;
};

export type WeeklyAdMetric = {
  id: string;
  week_start: string;
  investment_amount: number;
  impressions_count: number;
  reach_count: number;
  reported_leads_count: number;
  notes: string | null;
  filled_by: string | null;
  updated_at: string;
};

// Preenchida automaticamente 1x/dia pelo cron de sincronização com a Meta
// (ver app/api/cron/sync-meta-ads). weekly_ad_metrics continua existindo só
// como reserva manual.
export type DailyAdMetric = {
  id: string;
  metric_date: string;
  investment_amount: number;
  impressions_count: number;
  reach_count: number;
  reported_leads_count: number;
  updated_at: string;
};

export type MetricKey =
  | "cpl"
  | "cpa"
  | "lead_to_appointment_rate"
  | "attendance_rate"
  | "no_show_rate"
  | "rescheduled_rate"
  | "attendance_to_closing_rate"
  | "lead_to_closing_rate"
  | "avg_ticket"
  | "cac"
  | "roas";

export type GoalDirection = "higher_is_better" | "lower_is_better";

export type Goal = {
  id: string;
  // Normalmente é um MetricKey, mas a tabela também guarda metas que não são
  // taxas calculadas (ex.: "monthly_closings_target"), daí o | string.
  metric_key: MetricKey | string;
  target_value: number | null;
  direction: GoalDirection;
  updated_by: string | null;
  updated_at: string;
};

export type LeadStatus =
  | "novo"
  | "contatado"
  | "agendado"
  | "compareceu"
  | "no_show"
  | "comprou"
  | "perdido"
  | "sem_interesse";

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
  lead_source_id: string | null;
  name: string;
  whatsapp: string;
  form_answers: Record<string, string>;
  raw_payload: Record<string, unknown>;
  status: LeadStatus;
  notes: string | null;
  status_updated_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};
