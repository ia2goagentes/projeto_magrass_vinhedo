export const runtime = "nodejs";

import { createServiceClient } from "@/lib/supabase/service";
import { LEAD_TRACKING_KEYS } from "@/lib/types";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

const STANDARD_FIELDS = new Set([
  "name", "nome", "lead_name",
  "phone", "whatsapp", "telefone", "celular",
  "lead_id", "leadId",
]);

// Campos de rastreamento continuam em raw_payload (e alimentam origem +
// "Rastreamento"), mas não entram em form_answers pra não duplicar na tela.
const TRACKING_KEYS = new Set<string>(LEAD_TRACKING_KEYS);

// Descobre a origem do lead a partir do payload do Make, pra não precisar
// escolher na mão no CRM. Regras, em ordem:
//   1. Se o Make mandar "origin"/"origem" explícito, respeita.
//   2. Lead pago da Meta (tem campanha e não é orgânico) → "Facebook Ads".
//   3. Sem sinal suficiente (orgânico, ou Make ainda não envia campanha) →
//      null, mantendo o comportamento antigo de preencher manualmente.
// Não dá pra separar Facebook de Instagram só com os campos do Lead Ads, então
// tudo que é pago cai no mesmo balde "Facebook Ads".
function deriveOrigin(body: Record<string, unknown>): string | null {
  const explicit = body.origin ?? body.origem;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();

  const rawOrganic = body.is_organic;
  const isOrganic =
    rawOrganic === true || rawOrganic === 1 || rawOrganic === "true" || rawOrganic === "1";

  const hasCampaign = Boolean(
    body.campaign_name || body.campaign_id || body.ad_name || body.ad_id
  );

  if (!isOrganic && hasCampaign) return "Facebook Ads";
  return null;
}

export async function POST(request: Request) {
  const providedSecret = request.headers.get("x-webhook-secret");
  if (!process.env.WEBHOOK_SECRET || providedSecret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? body.nome ?? body.lead_name) as string | undefined;
  const phone = (body.phone ?? body.whatsapp ?? body.telefone ?? body.celular) as string | undefined;
  const leadSourceId = (body.lead_id ?? body.leadId) as string | undefined;

  if (!name || !phone) {
    return Response.json({ error: "Missing required fields: name, phone" }, { status: 422 });
  }

  const formAnswers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!STANDARD_FIELDS.has(k) && !TRACKING_KEYS.has(k)) formAnswers[k] = v;
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("leads")
    .upsert(
      {
        lead_source_id: leadSourceId ?? null,
        name,
        whatsapp: normalizePhone(phone),
        form_answers: formAnswers,
        raw_payload: body,
        status: "novo",
        source: "make_webhook",
        origin: deriveOrigin(body),
      },
      { onConflict: "lead_source_id", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    console.error("Lead insert error", { code: error.code });
    return Response.json({ error: "DB error" }, { status: 500 });
  }

  const isDuplicate = !data || data.length === 0;
  if (isDuplicate) {
    return Response.json({ ok: true, duplicate: true }, { status: 200 });
  }

  return Response.json({ ok: true, id: data[0].id }, { status: 201 });
}
