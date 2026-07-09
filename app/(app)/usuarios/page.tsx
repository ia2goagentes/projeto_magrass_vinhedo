"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, Role } from "@/lib/types";

const ROLE_LABELS: Record<Role, string> = {
  pendente: "Pendente (sem acesso)",
  sdr: "SDR",
  dona: "Dona da clínica",
  gestor: "Gestor",
  convidado: "Convidado",
};

type RowState = { role: Role; saving: boolean };

const selectClass =
  "rounded-lg border border-border-hairline bg-surface-card px-2 py-1.5 text-sm text-ink-primary outline-none focus:border-brand";

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ background: "var(--brand-gradient)" }}
    >
      {initialsFor(name)}
    </span>
  );
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at");

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as Profile[];
      setProfiles(list);
      setRows(Object.fromEntries(list.map((p) => [p.id, { role: p.role, saving: false }])));
      setLoading(false);
    }

    load();
  }, []);

  async function handleSave(profileId: string) {
    const row = rows[profileId];
    if (!row) return;

    setRows((prev) => ({ ...prev, [profileId]: { ...row, saving: true } }));
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role: row.role })
      .eq("id", profileId);

    setRows((prev) => ({ ...prev, [profileId]: { ...row, saving: false } }));

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: row.role } : p)));
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-ink-primary">Usuários</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        Quem se cadastra em <code>/signup</code>{" "}
        entra como &quot;pendente&quot; e não vê nada até você escolher o cargo aqui.
      </p>

      {errorMessage && <p className="mt-4 text-sm text-status-critical">{errorMessage}</p>}

      {loading ? (
        <p className="mt-6 text-sm text-ink-secondary">Carregando...</p>
      ) : (
        <div className="mt-6 rounded-2xl border border-border-hairline bg-surface-card shadow-sm">
          {/* Mobile: card list */}
          <div className="divide-y divide-border-hairline sm:hidden">
            {profiles.map((profile) => {
              const row = rows[profile.id];
              if (!row) return null;
              const pending = profile.role === "pendente";

              return (
                <div
                  key={profile.id}
                  className="p-4"
                  style={
                    pending
                      ? { background: "color-mix(in srgb, var(--status-warning) 8%, transparent)" }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={profile.name} />
                    <div>
                      <p className="text-sm font-medium text-ink-primary">{profile.name}</p>
                      <p className="text-xs text-ink-muted">{profile.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={row.role}
                      onChange={(e) =>
                        setRows((prev) => ({
                          ...prev,
                          [profile.id]: { ...row, role: e.target.value as Role },
                        }))
                      }
                      className={`flex-1 ${selectClass}`}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSave(profile.id)}
                      disabled={row.saving || row.role === profile.role}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      style={{ background: "var(--brand-gradient)" }}
                    >
                      {row.saving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-hairline text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Cargo</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => {
                  const row = rows[profile.id];
                  if (!row) return null;
                  const pending = profile.role === "pendente";

                  return (
                    <tr
                      key={profile.id}
                      className="border-b border-border-hairline last:border-0"
                      style={
                        pending
                          ? { background: "color-mix(in srgb, var(--status-warning) 8%, transparent)" }
                          : undefined
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={profile.name} />
                          <span className="text-ink-primary">{profile.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary">{profile.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={row.role}
                          onChange={(e) =>
                            setRows((prev) => ({
                              ...prev,
                              [profile.id]: { ...row, role: e.target.value as Role },
                            }))
                          }
                          className={selectClass}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSave(profile.id)}
                          disabled={row.saving || row.role === profile.role}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          style={{ background: "var(--brand-gradient)" }}
                        >
                          {row.saving ? "Salvando..." : "Salvar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
