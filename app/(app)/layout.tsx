import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { Profile } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "pendente") {
    redirect("/pendente");
  }

  return (
    <div className="min-h-screen bg-surface-page lg:flex">
      <Sidebar role={profile.role} name={profile.name} />
      {/* min-w-0: sem isso o item flex não encolhe abaixo da largura do conteúdo,
          e conteúdo largo (ex.: Kanban de leads) faz a página inteira rolar na
          horizontal em vez de o scroll ficar contido no próprio componente. */}
      <div className="min-w-0 lg:flex-1 lg:pl-64">
        <main className="min-w-0 px-4 pt-5 pb-24 sm:px-6 sm:pt-6 sm:pb-24 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
