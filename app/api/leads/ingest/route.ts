export const runtime = "nodejs";

import { createServiceClient } from "@/lib/supabase/service";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

const STANDARD_FIELDS = new Set([
  "name", "nome", "lead_name",
  "phone", "whatsapp", "telefone", "celular",
  "lead_id", "leadId",
]);

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
    if (!STANDARD_FIELDS.has(k)) formAnswers[k] = v;
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
