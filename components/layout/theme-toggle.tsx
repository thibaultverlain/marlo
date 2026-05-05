"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("marlo-theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("marlo-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span className="flex-1 text-left">
        {theme === "dark" ? "Mode clair" : "Mode sombre"}
      </span>
    </button>
  );
}
