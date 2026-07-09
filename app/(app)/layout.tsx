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
      <div className="lg:pl-64 lg:flex-1">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
