"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  Megaphone,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@/lib/types";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";

const ROLE_LABELS: Record<Role, string> = {
  pendente: "Pendente",
  sdr: "SDR",
  dona: "Dona da clínica",
  gestor: "Gestor",
  convidado: "Convidado",
};

export type NavLink = { href: string; label: string; icon: LucideIcon; roles?: Role[] };

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lancamento", label: "Lançamento diário", icon: ClipboardList, roles: ["sdr", "gestor"] },
  { href: "/anuncios", label: "Anúncios", icon: Megaphone, roles: ["gestor"] },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/metas", label: "Metas", icon: Target, roles: ["gestor"] },
  { href: "/usuarios", label: "Usuários", icon: Users, roles: ["gestor"] },
];

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LogoBadge() {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
      style={{ background: "var(--brand-gradient)" }}
    >
      M
    </span>
  );
}

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const visibleLinks = LINKS.filter((link) => !link.roles || link.roles.includes(role));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border-hairline bg-surface-card lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <LogoBadge />
          <span className="text-sm font-semibold text-ink-primary">Clínica Magras</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {visibleLinks.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-ink-secondary hover:bg-ink-primary/5"
                }`}
              >
                <Icon size={17} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border-hairline px-3 py-4">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-primary/10 text-xs font-semibold text-ink-primary">
              {initialsFor(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
              <p className="text-xs text-ink-muted">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <div className="mt-2 space-y-0.5">
            <ThemeToggle variant="expanded" />
            <LogoutButton variant="expanded" />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-hairline bg-surface-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <LogoBadge />
          <span className="text-sm font-semibold text-ink-primary">Clínica Magras</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <MobileNav links={visibleLinks} name={name} role={ROLE_LABELS[role]} />
        </div>
      </header>
    </>
  );
}
