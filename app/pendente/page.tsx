import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { AuthCard } from "@/components/AuthCard";

export default async function PendentePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AuthCard title="Conta criada!">
      <p className="mt-2 text-sm text-ink-secondary">
        Sua conta ainda não tem um cargo definido. Peça para o gestor liberar
        seu acesso na tela de Usuários — depois disso é só entrar de novo.
      </p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </AuthCard>
  );
}
