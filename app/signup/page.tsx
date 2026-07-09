"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/AuthCard";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setStatus("sending");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message === "User already registered"
          ? "Esse e-mail já tem cadastro. Faça login."
          : error.message
      );
      return;
    }

    if (!data.session) {
      // "Confirm email" está habilitado no Supabase — precisa confirmar antes de entrar.
      setNeedsConfirmation(true);
      setStatus("idle");
      return;
    }

    router.push("/pendente");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <AuthCard title="Confirme seu e-mail">
        <p className="mt-2 text-sm text-ink-secondary">
          Enviamos um link de confirmação para <strong>{email}</strong>. Clique
          nele para ativar sua conta e depois faça login normalmente.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Criar cadastro" subtitle="Depois de criar a conta, o gestor libera seu acesso.">
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          required
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
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
          minLength={6}
          placeholder="Senha (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          placeholder="Confirmar senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-border-hairline bg-surface-card px-3 py-2 text-sm text-ink-primary outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
          style={{ background: "var(--brand-gradient)" }}
        >
          {status === "sending" ? "Criando conta..." : "Criar cadastro"}
        </button>
        {status === "error" && <p className="text-sm text-status-critical">{errorMessage}</p>}
      </form>

      <p className="mt-4 text-center text-sm text-ink-secondary">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
