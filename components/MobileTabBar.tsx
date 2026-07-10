"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { NavLink } from "@/components/Sidebar";

const PRIMARY_COUNT = 4;

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function MobileTabBar({
  links,
  name,
  role,
}: {
  links: NavLink[];
  name: string;
  role: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const primary = links.slice(0, PRIMARY_COUNT);
  const overflow = links.slice(PRIMARY_COUNT);
  const overflowActive = overflow.some((link) => link.href === pathname);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-hairline bg-surface-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primary.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-accent" : "text-ink-secondary"
              }`}
            >
              <Icon size={20} />
              <span className="truncate px-1">{link.label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
            overflowActive ? "text-accent" : "text-ink-secondary"
          }`}
        >
          <MoreHorizontal size={20} />
          <span>Mais</span>
        </button>
      </nav>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border-hairline bg-surface-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-primary/10 text-xs font-semibold text-ink-primary">
                  {initialsFor(name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
                  <p className="text-xs text-ink-muted">{role}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-ink-secondary hover:bg-ink-primary/5"
              >
                <X size={18} />
              </button>
            </div>

            {overflow.length > 0 && (
              <nav className="mt-4 space-y-1 border-t border-border-hairline pt-3">
                {overflow.map((link) => {
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
            )}

            <div className="mt-3 space-y-0.5 border-t border-border-hairline pt-3">
              <ThemeToggle variant="expanded" />
              <LogoutButton variant="expanded" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
