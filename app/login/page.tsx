"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Dashboard de Funil" subtitle="Entre com seu e-mail e senha.">
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {status === "sending" ? "Entrando..." : "Entrar"}
        </button>
        {status === "error" && <p className="text-sm text-status-critical">{errorMessage}</p>}
      </form>

      <p className="mt-4 text-center text-sm text-ink-secondary">
        Não tem conta?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Criar cadastro
        </Link>
      </p>
    </AuthCard>
  );
}
