import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * EmptyState — pattern unique pour tous les ecrans "rien a afficher".
 * 3 niveaux d'opacite/taille selon le contexte (table vide, page vide, modal vide).
 *
 * Usage :
 *   <EmptyState
 *     icon={Package}
 *     title="Aucun article en stock"
 *     description="Ton stock est vide. Ajoute ton premier article pour commencer."
 *     action={{ href: "/products/new", label: "Ajouter un article" }}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "page",
  className = "",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { href: string; label: string } | { onClick: () => void; label: string };
  variant?: "page" | "inline" | "compact";
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
      <div className={`${s.iconBox} rounded-2xl bg-[var(--color-bg-hover)] flex items-center justify-center mb-4 relative`}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/5 via-transparent to-emerald-500/5" />
        <Icon size={s.iconSize} className="text-zinc-500 relative" strokeWidth={1.5} />
      </div>

      <p className={`${s.title} font-semibold text-white mb-1.5`}>{title}</p>

      {description && (
        <p className={`${s.desc} text-zinc-500 max-w-sm mb-5 leading-relaxed`}>{description}</p>
      )}

      {action && "href" in action && (
        <Link
          href={action.href}
          className="btn-primary text-[13px]"
        >
          {action.label}
        </Link>
      )}
      {action && "onClick" in action && (
        <button onClick={action.onClick} className="btn-primary text-[13px]">
          {action.label}
        </button>
      )}
    </div>
  );
}
