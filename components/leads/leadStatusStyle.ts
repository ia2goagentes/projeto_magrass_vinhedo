import { LeadStatus } from "@/lib/types";

// Ordem funil-friendly das colunas do Kanban
export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "novo",
  "contatado",
  "agendado",
  "compareceu",
  "no_show",
  "comprou",
  "perdido",
  "sem_interesse",
];

export const LEAD_STATUS_COLOR_VAR: Record<LeadStatus, string> = {
  novo: "var(--identity-blue)",
  contatado: "var(--identity-teal)",
  agendado: "var(--identity-amber)",
  compareceu: "var(--identity-green)",
  no_show: "var(--status-serious)",
  comprou: "var(--status-good)",
  perdido: "var(--status-critical)",
  sem_interesse: "var(--ink-muted)",
};

export function humanizeFormAnswerKey(key: string): string {
  const withSpaces = key.replace(/_/g, " ").trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function formatWhatsApp(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 13) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.length === 12) {
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  return digits;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
