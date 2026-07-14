import { createClient } from "@/lib/supabase/server";
import { Role } from "@/lib/types";

/**
 * Confere sessão e papel do usuário em route handlers. O middleware já barra o
 * acesso às páginas por papel, mas rotas de API não estão nessa lista — e estas
 * escrevem com service role (bypass de RLS), então a checagem aqui é a única
 * defesa real.
 *
 * Retorna null quando autorizado, ou a Response de erro a ser devolvida.
 */
export async function requireRole(allowed: Role[]): Promise<Response | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: Role }>();

  if (!profile || !allowed.includes(profile.role)) {
    return Response.json({ error: "Sem permissão." }, { status: 403 });
  }

  return null;
}
