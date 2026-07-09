/**
 * Server-only service-role Supabase client.
 *
 * NEVER import from client components — SUPABASE_SERVICE_ROLE_KEY would be bundled into
 * the browser JS (catastrophic security failure).
 * NEVER import from server components either — use lib/supabase/server.ts instead.
 * ONLY use in server-side route handlers that need to bypass RLS (webhook ingest, etc).
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
