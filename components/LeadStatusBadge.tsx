"use client";

import { LeadStatus, LEAD_STATUS_LABELS } from "@/lib/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  novo: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contatado: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  agendado: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  compareceu: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  comprou: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  perdido: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  sem_interesse: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
