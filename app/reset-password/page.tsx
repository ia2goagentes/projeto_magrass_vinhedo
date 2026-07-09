"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setStatus("saving");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard
      title="Nova senha"
      subtitle="Defina uma nova senha para sua conta."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          required
          minLength={6}
          placeholder="Nova senha (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {status === "saving" ? "Salvando..." : "Salvar nova senha"}
        </button>
        {status === "error" && (
          <p className="text-sm text-status-critical">{errorMessage}</p>
        )}
      </form>
    </AuthCard>
  );
}
