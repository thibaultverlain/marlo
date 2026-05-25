import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * PageHeader — header coherent pour toutes les pages de l'app.
 *
 * Sans backHref : header normal (h1 + sous-titre + actions a droite)
 * Avec backHref : header avec fleche retour, plus compact
 *
 * Usage :
 *   <PageHeader
 *     title="Stock"
 *     subtitle="42 articles en stock"
 *     actions={<Button>Ajouter</Button>}
 *   />
 *
 *   <PageHeader
 *     backHref="/products"
 *     title="Stock dormant"
 *     subtitle="Produits dormants depuis 30 jours"
 *   />
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  level = "page",
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
  level?: "page" | "sub";
}) {
  const titleClass = level === "page"
    ? "text-2xl lg:text-3xl font-bold tracking-tight"
    : "text-2xl font-bold tracking-tight";

  return (
    <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className={`${titleClass} text-white`}>{title}</h1>
          {subtitle && (
            <p className="text-zinc-500 text-sm mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
