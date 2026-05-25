"use client";

import { AlertOctagon, RotateCcw } from "lucide-react";
import Link from "next/link";

/**
 * ErrorState — pattern unique pour tous les ecrans d'erreur.
 * Symetrique a EmptyState. 3 variants (page/inline/compact).
 *
 * Usage :
 *   <ErrorState
 *     title="Impossible de charger le stock"
 *     description="Une erreur reseau est survenue."
 *     onRetry={() => router.refresh()}
 *   />
 */
export function ErrorState({
  title = "Quelque chose s'est mal passe",
  description,
  onRetry,
  backHref,
  variant = "page",
  details,
  className = "",
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  backHref?: string;
  variant?: "page" | "inline" | "compact";
  details?: string;
  className?: string;
}) {
  const sizes = {
    page: { wrap: "py-16", iconBox: "w-16 h-16", iconSize: 28, title: "text-[16px]", desc: "text-[13px]" },
    inline: { wrap: "py-10", iconBox: "w-12 h-12", iconSize: 22, title: "text-[14px]", desc: "text-[12px]" },
    compact: { wrap: "py-6", iconBox: "w-10 h-10", iconSize: 18, title: "text-[13px]", desc: "text-[11px]" },
  } as const;
  const s = sizes[variant];

  return (
    <div className={`${s.wrap} flex flex-col items-center justify-center text-center px-6 ${className}`}>
      <div className={`${s.iconBox} rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4`}>
        <AlertOctagon size={s.iconSize} className="text-red-400" strokeWidth={1.5} />
      </div>

      <p className={`${s.title} font-semibold text-white mb-1.5`}>{title}</p>

      {description && (
        <p className={`${s.desc} text-zinc-500 max-w-sm mb-5 leading-relaxed`}>{description}</p>
      )}

      {details && (
        <details className="text-[11px] text-zinc-500 max-w-md mb-5 cursor-pointer">
          <summary className="hover:text-zinc-400 transition-colors">Details techniques</summary>
          <pre className="mt-2 p-3 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg text-left overflow-x-auto whitespace-pre-wrap break-words">
            {details}
          </pre>
        </details>
      )}

      <div className="flex gap-2">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary text-[13px]">
            <RotateCcw size={13} />
            Reessayer
          </button>
        )}
        {backHref && (
          <Link href={backHref} className="btn-secondary text-[13px]">
            Retour
          </Link>
        )}
      </div>
    </div>
  );
}
