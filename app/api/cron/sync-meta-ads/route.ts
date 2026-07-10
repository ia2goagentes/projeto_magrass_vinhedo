export const runtime = "nodejs";

import { toDateKey, mondayOf } from "@/lib/dates";
import { fetchMetaInsights } from "@/lib/meta";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const weekStart = toDateKey(mondayOf(today));
  const todayKey = toDateKey(today);

  const insights = await fetchMetaInsights(weekStart, todayKey);

  const supabase = createServiceClient();
  const { error } = await supabase.from("weekly_ad_metrics").upsert(
    {
      week_start: weekStart,
      investment_amount: insights.investment,
      impressions_count: insights.impressions,
      reach_count: insights.reach,
      reported_leads_count: insights.reportedLeads,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "week_start" }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, week_start: weekStart, ...insights });
}
