export const runtime = "nodejs";

import { subDays } from "date-fns";
import { toDateKey } from "@/lib/dates";
import { fetchMetaInsightsDaily } from "@/lib/meta";
import { createServiceClient } from "@/lib/supabase/service";

// Quantos dias reprocessar a cada execução. Olhar só "ontem" deixa um buraco
// permanente sempre que um run falha ou a Vercel atrasa/pula o disparo; ao
// reprocessar uma janela curta, o run do dia seguinte tapa sozinho o que
// faltou. O upsert é por data (onConflict: metric_date), então reprocessar
// dias já gravados só atualiza — nunca duplica.
const BACKFILL_DAYS = 3;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Janela: de (hoje - BACKFILL_DAYS) até ONTEM, inclusive. Não incluímos hoje
  // porque o Meta ainda não fechou os números do dia corrente.
  const until = toDateKey(subDays(new Date(), 1));
  const since = toDateKey(subDays(new Date(), BACKFILL_DAYS));

  let days;
  try {
    days = await fetchMetaInsightsDaily(since, until);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido.";
    console.error(`[cron sync-meta-ads] Falha ao consultar a Meta (${since}..${until}):`, message);
    return Response.json({ error: `Falha ao consultar a Meta: ${message}` }, { status: 502 });
  }

  if (days.length === 0) {
    console.log(`[cron sync-meta-ads] Meta sem veiculação em ${since}..${until} — nada gravado.`);
    return Response.json({ ok: true, since, until, imported: 0, days: [] });
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
    console.error(`[cron sync-meta-ads] Falha ao gravar no banco (${since}..${until}):`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(
    `[cron sync-meta-ads] OK — ${days.length} dia(s) sincronizado(s) em ${since}..${until}: ` +
      days.map((d) => d.date).join(", ")
  );
  return Response.json({ ok: true, since, until, imported: days.length, days });
}
