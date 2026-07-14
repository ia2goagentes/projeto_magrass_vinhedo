export const runtime = "nodejs";

import { requireRole } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Ajuste manual de um dia em daily_ad_metrics. Plano B para quando a Meta
// estiver fora do ar ou o número precisar de correção na mão.
export async function POST(request: Request) {
  const denied = await requireRole(["gestor"]);
  if (denied) return denied;

  const body = await request.json();
  const metricDate = body.metric_date;

  if (!DATE_RE.test(metricDate ?? "")) {
    return Response.json({ error: "Data inválida." }, { status: 400 });
  }

  const numbers = {
    investment_amount: Number(body.investment_amount) || 0,
    impressions_count: Math.round(Number(body.impressions_count) || 0),
    reach_count: Math.round(Number(body.reach_count) || 0),
    reported_leads_count: Math.round(Number(body.reported_leads_count) || 0),
  };

  if (Object.values(numbers).some((n) => n < 0 || !Number.isFinite(n))) {
    return Response.json({ error: "Valores não podem ser negativos." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("daily_ad_metrics").upsert(
    { metric_date: metricDate, ...numbers, updated_at: new Date().toISOString() },
    { onConflict: "metric_date" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, metric_date: metricDate, ...numbers });
}
