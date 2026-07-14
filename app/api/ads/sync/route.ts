export const runtime = "nodejs";

import { differenceInCalendarDays } from "date-fns";
import { requireRole } from "@/lib/api-auth";
import { fetchMetaInsightsDaily } from "@/lib/meta";
import { createServiceClient } from "@/lib/supabase/service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 92;

// Puxa da Meta as métricas dia a dia de um intervalo e grava em
// daily_ad_metrics — a mesma tabela que o cron diário alimenta. Serve para
// preencher períodos anteriores à entrada do cron no ar.
export async function POST(request: Request) {
  const denied = await requireRole(["gestor"]);
  if (denied) return denied;

  const { since, until } = await request.json();

  if (!DATE_RE.test(since ?? "") || !DATE_RE.test(until ?? "")) {
    return Response.json({ error: "Datas inválidas." }, { status: 400 });
  }

  const spanDays = differenceInCalendarDays(new Date(until), new Date(since)) + 1;

  if (spanDays < 1) {
    return Response.json(
      { error: "A data de início deve ser anterior ou igual à data de fim." },
      { status: 400 }
    );
  }

  if (spanDays > MAX_DAYS) {
    return Response.json(
      { error: `Intervalo muito longo (máximo de ${MAX_DAYS} dias por vez).` },
      { status: 400 }
    );
  }

  let days;
  try {
    days = await fetchMetaInsightsDaily(since, until);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido.";
    return Response.json({ error: `Falha ao consultar a Meta: ${message}` }, { status: 502 });
  }

  if (days.length === 0) {
    return Response.json({ ok: true, imported: 0, days: [] });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("daily_ad_metrics").upsert(
    days.map((day) => ({
      metric_date: day.date,
      investment_amount: day.investment,
      impressions_count: day.impressions,
      reach_count: day.reach,
      reported_leads_count: day.reportedLeads,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "metric_date" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, imported: days.length, days });
}
