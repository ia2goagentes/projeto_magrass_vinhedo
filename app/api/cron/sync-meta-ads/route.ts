export const runtime = "nodejs";

import { subDays } from "date-fns";
import { toDateKey } from "@/lib/dates";
import { fetchMetaInsights } from "@/lib/meta";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Roda 1x/dia (9h) e busca o dia ANTERIOR — só nesse ponto o Meta já
  // consolidou os números do dia inteiro.
  const yesterday = subDays(new Date(), 1);
  const metricDate = toDateKey(yesterday);

  const insights = await fetchMetaInsights(metricDate, metricDate);

  const supabase = createServiceClient();
  const { error } = await supabase.from("daily_ad_metrics").upsert(
    {
      metric_date: metricDate,
      investment_amount: insights.investment,
      impressions_count: insights.impressions,
      reach_count: insights.reach,
      reported_leads_count: insights.reportedLeads,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "metric_date" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, metric_date: metricDate, ...insights });
}
