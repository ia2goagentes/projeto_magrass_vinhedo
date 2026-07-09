"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/lib/types";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav } from "@/components/MobileNav";

const LINKS: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lancamento", label: "Lançamento diário", roles: ["sdr", "gestor"] },
  { href: "/anuncios", label: "Anúncios", roles: ["gestor"] },
  { href: "/metas", label: "Metas", roles: ["gestor"] },
  { href: "/usuarios", label: "Usuários", roles: ["gestor"] },
];

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppNav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const visibleLinks = LINKS.filter((link) => !link.roles || link.roles.includes(role));

  return (
    <header className="sticky top-0 z-30 border-b border-border-hairline bg-surface-card/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--brand-gradient)" }}
          >
            M
          </span>
          <span className="text-sm font-semibold text-ink-primary">Clínica Magras</span>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {visibleLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-brand/10 text-brand" : "text-ink-secondary hover:bg-ink-primary/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: "var(--brand-gradient)" }}
            >
              {initialsFor(name)}
            </span>
            <span className="text-sm text-ink-secondary">{name}</span>
          </div>
          <LogoutButton />
          <MobileNav links={visibleLinks} />
        </div>
      </div>
    </header>
  );
}
