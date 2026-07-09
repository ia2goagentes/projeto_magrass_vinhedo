"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MobileNav({
  links,
  name,
  role,
}: {
  links: { href: string; label: string; icon: LucideIcon }[];
  name: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-ink-primary/5"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-border-hairline bg-surface-card px-4 py-3 shadow-lg">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-accent/10 text-accent" : "text-ink-secondary hover:bg-ink-primary/5"
                  }`}
                >
                  <Icon size={17} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 border-t border-border-hairline pt-3">
            <div className="flex items-center gap-2 px-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-primary/10 text-xs font-semibold text-ink-primary">
                {initialsFor(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
                <p className="text-xs text-ink-muted">{role}</p>
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <ThemeToggle variant="expanded" />
              <LogoutButton variant="expanded" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
