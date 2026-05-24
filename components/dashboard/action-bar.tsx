"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type Action = {
  key: string;
  icon: LucideIcon;
  label: string;
  count: number;
  href: string;
  tone: "danger" | "warning" | "accent" | "neutral";
};

/**
 * ActionBar — une seule barre compacte avec les actions urgentes du jour.
 * Remplace les 5 cards de l'ancien design pour eviter la dispersion visuelle.
 *
 * Tone : choisi selon la gravite (taches en retard = danger, dormants = warning, etc.)
 */
const TONE_STYLES: Record<Action["tone"], { dot: string; text: string; bg: string }> = {
  danger:  { dot: "bg-red-400",     text: "text-red-300",     bg: "hover:bg-red-500/8" },
  warning: { dot: "bg-amber-400",   text: "text-amber-300",   bg: "hover:bg-amber-500/8" },
  accent:  { dot: "bg-rose-400",    text: "text-rose-300",    bg: "hover:bg-rose-500/8" },
  neutral: { dot: "bg-zinc-400",    text: "text-zinc-300",    bg: "hover:bg-zinc-500/8" },
};

export default function ActionBar({ actions }: { actions: Action[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="card-static overflow-hidden">
      <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2 px-4 py-3 sm:py-0 bg-[var(--color-bg-raised)]/40">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">A faire</span>
          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">{actions.length}</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border-subtle)]">
          {actions.map((a) => {
            const tone = TONE_STYLES[a.tone];
            const Icon = a.icon;
            return (
              <Link
                key={a.key}
                href={a.href}
                className={`flex-1 flex items-center gap-3 px-4 py-3 transition-colors ${tone.bg} group`}
              >
                <div className={`w-2 h-2 rounded-full ${tone.dot} flex-shrink-0`} />
                <Icon size={14} className={`flex-shrink-0 ${tone.text}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-zinc-400 truncate group-hover:text-white transition-colors">
                    {a.label}
                  </p>
                </div>
                <span className={`text-[14px] font-bold tabular-nums ${tone.text}`}>{a.count}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
