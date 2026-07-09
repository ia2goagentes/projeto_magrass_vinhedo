"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Sair"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-ink-primary/5 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-sm sm:font-medium"
    >
      <LogOut size={18} />
      <span className="hidden sm:inline">Sair</span>
    </button>
  );
}
