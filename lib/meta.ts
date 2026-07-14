const GRAPH_API_VERSION = "v21.0";

export type MetaWeeklyInsights = {
  investment: number;
  impressions: number;
  reach: number;
  reportedLeads: number;
};

export type MetaDailyInsights = MetaWeeklyInsights & { date: string };

type MetaAction = { action_type: string; value: string };
type MetaInsightsRow = {
  date_start?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  actions?: MetaAction[];
};

function parseRow(row: MetaInsightsRow): MetaWeeklyInsights {
  const leadAction = row.actions?.find((a) => a.action_type === "lead");

  return {
    investment: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    reach: Number(row.reach ?? 0),
    reportedLeads: Number(leadAction?.value ?? 0),
  };
}

async function requestInsights(
  since: string,
  until: string,
  daily: boolean
): Promise<MetaInsightsRow[]> {
  const accountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accountId || !accessToken) {
    throw new Error("META_AD_ACCOUNT_ID ou META_ACCESS_TOKEN não configurados.");
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/insights`);
  url.searchParams.set("fields", "spend,impressions,reach,actions");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  // time_increment=1 quebra o resultado em uma linha por dia, em vez de um
  // único total agregado do intervalo.
  if (daily) url.searchParams.set("time_increment", "1");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Meta Graph API error: ${JSON.stringify(body)}`);
  }

  return body.data ?? [];
}

/**
 * Busca as métricas da Meta dia a dia no intervalo since..until (inclusive).
 * Dias sem veiculação simplesmente não voltam da API — o chamador decide o que
 * fazer com eles (aqui, não são gravados).
 */
export async function fetchMetaInsightsDaily(
  since: string,
  until: string
): Promise<MetaDailyInsights[]> {
  const rows = await requestInsights(since, until, true);

  return rows
    .filter((row): row is MetaInsightsRow & { date_start: string } => Boolean(row.date_start))
    .map((row) => ({ date: row.date_start, ...parseRow(row) }));
}

/**
 * Busca investimento, impressões, alcance e leads da conta de anúncios da Meta
 * para o intervalo since..until (formato yyyy-MM-dd, inclusive).
 */
export async function fetchMetaInsights(
  since: string,
  until: string
): Promise<MetaWeeklyInsights> {
  const rows = await requestInsights(since, until, false);
  const row = rows[0];

  // Sem veiculação no período (ex: nenhuma campanha ativa) — tudo zero.
  if (!row) return { investment: 0, impressions: 0, reach: 0, reportedLeads: 0 };

  return parseRow(row);
}
