const GRAPH_API_VERSION = "v21.0";

export type MetaWeeklyInsights = {
  investment: number;
  impressions: number;
  reach: number;
  reportedLeads: number;
};

type MetaAction = { action_type: string; value: string };
type MetaInsightsRow = {
  spend?: string;
  impressions?: string;
  reach?: string;
  actions?: MetaAction[];
};

/**
 * Busca investimento, impressões, alcance e leads da conta de anúncios da Meta
 * para o intervalo since..until (formato yyyy-MM-dd, inclusive).
 */
export async function fetchMetaInsights(
  since: string,
  until: string
): Promise<MetaWeeklyInsights> {
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error("META_AD_ACCOUNT_ID ou META_ACCESS_TOKEN não configurados.");
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/insights`);
  url.searchParams.set("fields", "spend,impressions,reach,actions");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Meta Graph API error: ${JSON.stringify(body)}`);
  }

  const row: MetaInsightsRow | undefined = body.data?.[0];
  if (!row) {
    // Sem veiculação no período (ex: nenhuma campanha ativa) — tudo zero.
    return { investment: 0, impressions: 0, reach: 0, reportedLeads: 0 };
  }

  const leadAction = row.actions?.find((a) => a.action_type === "lead");

  return {
    investment: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    reach: Number(row.reach ?? 0),
    reportedLeads: Number(leadAction?.value ?? 0),
  };
}
