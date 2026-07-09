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
  metric_key: MetricKey;
  target_value: number | null;
  direction: GoalDirection;
  updated_by: string | null;
  updated_at: string;
};
