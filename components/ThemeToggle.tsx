"use client";

import { useState } from "react";
import { ChevronRight, Moon, Sun } from "lucide-react";

function getInitialDark(): boolean {
  // During SSR there is no document — default to false (light).
  // The layout's beforeInteractive script sets the correct class before
  // React hydrates, so reading the class here gives the right value.
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle({ variant = "compact" }: { variant?: "compact" | "expanded" }) {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (variant === "expanded") {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm text-ink-secondary hover:bg-ink-primary/5"
      >
        <span className="flex items-center gap-2">
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
          {isDark ? "Escuro" : "Claro"}
        </span>
        <ChevronRight size={16} className="text-ink-muted" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-ink-primary/5"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
