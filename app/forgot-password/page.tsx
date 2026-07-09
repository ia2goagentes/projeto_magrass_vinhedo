"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const redirectTo =
      window.location.origin + "/auth/callback?next=/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <AuthCard title="E-mail enviado">
        <p className="mt-4 text-sm text-ink-secondary">
          Se <strong>{email}</strong> tiver uma conta, você receberá um link
          para redefinir sua senha. Verifique também a caixa de spam.
        </p>
        <p className="mt-4 text-center text-sm text-ink-secondary">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Voltar ao login
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Recuperar senha"
      subtitle="Informe seu e-mail e enviaremos um link para redefinir sua senha."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {status === "sending" ? "Enviando..." : "Enviar link de redefinição"}
        </button>
        {status === "error" && (
          <p className="text-sm text-status-critical">{errorMessage}</p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-ink-secondary">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Voltar ao login
        </Link>
      </p>
    </AuthCard>
  );
}
