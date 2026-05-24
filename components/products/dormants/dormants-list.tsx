"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpDown, AlertTriangle, Flame, Snowflake, Skull,
  Tag, Check, Loader2, ExternalLink,
} from "lucide-react";
import type { Product } from "@/lib/db/schema";
import { formatCurrency, daysSince } from "@/lib/utils";
import { computeDormantSuggestion, type DormantSuggestion } from "@/lib/pricing/dormant-suggestions";
import { applyDormantPriceSuggestionAction } from "@/lib/actions/products";

type EnrichedProduct = Product & {
  _days: number;
  _suggestion: DormantSuggestion;
};

type SortKey = "days" | "purchase" | "target" | "potential_loss" | "brand";

const SEVERITY_CONFIG = {
  watch:    { icon: Snowflake,     color: "text-zinc-400",    bg: "bg-zinc-500/8 border-zinc-500/20",    label: "Recent" },
  warm:     { icon: AlertTriangle, color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/25", label: "Tiede" },
  hot:      { icon: Flame,         color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/25", label: "Chaud" },
  critical: { icon: Skull,         color: "text-red-400",     bg: "bg-red-500/10 border-red-500/25",      label: "Critique" },
};

export default function DormantsList({ products }: { products: Product[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("days");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  // Enrichir chaque produit avec sa suggestion
  const enriched: EnrichedProduct[] = useMemo(
    () =>
      products.map((p) => {
        const days = daysSince(p.createdAt);
        const suggestion = computeDormantSuggestion(
          days,
          Number(p.purchasePrice),
          p.targetPrice ? Number(p.targetPrice) : null,
        );
        return { ...p, _days: days, _suggestion: suggestion };
      }),
    [products],
  );

  // Liste des marques pour le filtre
  const allBrands = useMemo(() => {
    const set = new Set(enriched.map((p) => p.brand));
    return Array.from(set).sort();
  }, [enriched]);

  // Filtrage + tri
  const filtered = useMemo(() => {
    let list = enriched;
    if (brandFilter) list = list.filter((p) => p.brand === brandFilter);
    if (severityFilter) list = list.filter((p) => p._suggestion.severity === severityFilter);

    const sorted = [...list].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "days":           diff = a._days - b._days; break;
        case "purchase":       diff = Number(a.purchasePrice) - Number(b.purchasePrice); break;
        case "target":         diff = Number(a.targetPrice ?? 0) - Number(b.targetPrice ?? 0); break;
        case "brand":          diff = a.brand.localeCompare(b.brand); break;
        case "potential_loss": {
          const la = Number(a.targetPrice ?? a.purchasePrice) - Number(a.purchasePrice);
          const lb = Number(b.targetPrice ?? b.purchasePrice) - Number(b.purchasePrice);
          diff = la - lb;
          break;
        }
      }
      return sortDir === "asc" ? diff : -diff;
    });
    return sorted;
  }, [enriched, sortKey, sortDir, brandFilter, severityFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (products.length === 0) {
    return (
      <div className="card-static p-12 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <Check size={26} className="text-emerald-400" />
        </div>
        <p className="text-[15px] font-semibold text-white">Aucun stock dormant</p>
        <p className="text-[13px] text-zinc-500 mt-1">Tout ton stock a moins de 30 jours. Bonne rotation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="card-static p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Marque</label>
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-1.5 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg text-[12px] text-zinc-300 focus:outline-none focus:border-rose-500/50"
          >
            <option value="">Toutes</option>
            {allBrands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500">Severite</label>
          <div className="flex gap-1">
            {(["", "warm", "hot", "critical"] as const).map((s) => (
              <button
                key={s || "all"}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                  severityFilter === s
                    ? "bg-rose-500/15 text-rose-300"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-[var(--color-bg-hover)]"
                }`}
              >
                {s === "" ? "Tous" : SEVERITY_CONFIG[s as keyof typeof SEVERITY_CONFIG].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto text-[11px] text-zinc-500">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {/* Header desktop */}
        <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <SortHeader k="brand" current={sortKey} dir={sortDir} onClick={() => toggleSort("brand")}>Produit</SortHeader>
          <SortHeader k="days" current={sortKey} dir={sortDir} onClick={() => toggleSort("days")}>Jours</SortHeader>
          <SortHeader k="purchase" current={sortKey} dir={sortDir} onClick={() => toggleSort("purchase")}>Achete</SortHeader>
          <SortHeader k="target" current={sortKey} dir={sortDir} onClick={() => toggleSort("target")}>Prix cible</SortHeader>
          <div>Suggestion</div>
          <div></div>
        </div>

        {filtered.map((p) => <DormantRow key={p.id} product={p} />)}
      </div>
    </div>
  );
}

function SortHeader({ k, current, dir, onClick, children }: { k: SortKey; current: SortKey; dir: "asc" | "desc"; onClick: () => void; children: React.ReactNode }) {
  const active = current === k;
  return (
    <button onClick={onClick} className={`flex items-center gap-1 text-left ${active ? "text-zinc-300" : ""}`}>
      <span>{children}</span>
      <ArrowUpDown size={9} className={active ? "" : "opacity-30"} />
    </button>
  );
}

function DormantRow({ product }: { product: EnrichedProduct }) {
  const cfg = SEVERITY_CONFIG[product._suggestion.severity];
  const Icon = cfg.icon;
  const [isPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applySuggestion() {
    if (!product._suggestion.suggestedPrice) return;
    setError(null);
    startTransition(async () => {
      const result = await applyDormantPriceSuggestionAction(product.id, product._suggestion.suggestedPrice!);
      if (result.error) setError(result.error);
      else setApplied(true);
    });
  }

  const hasSuggestion = product._suggestion.suggestedPrice !== null && product._suggestion.feasible;

  return (
    <div className={`card-static p-4 lg:p-3 border ${cfg.bg}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_2fr_auto] gap-3 lg:items-center">
        {/* Produit */}
        <Link href={`/products/${product.id}`} className="flex items-center gap-2 group">
          <Icon size={14} className={`flex-shrink-0 ${cfg.color}`} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white truncate group-hover:text-rose-300 transition-colors">{product.title}</p>
            <p className="text-[11px] text-zinc-500 font-mono truncate">{product.brand} {product.model && `· ${product.model}`}</p>
          </div>
          <ExternalLink size={11} className="text-zinc-700 group-hover:text-zinc-500 transition-colors opacity-0 group-hover:opacity-100" />
        </Link>

        {/* Jours */}
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider lg:hidden">Jours en stock</p>
          <p className={`text-[14px] font-bold ${cfg.color} tabular-nums`}>{product._days}j</p>
        </div>

        {/* Prix achat */}
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider lg:hidden">Achete</p>
          <p className="text-[13px] text-zinc-300 tabular-nums">{formatCurrency(Number(product.purchasePrice))}</p>
        </div>

        {/* Prix cible */}
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider lg:hidden">Prix cible</p>
          <p className="text-[13px] text-zinc-300 tabular-nums">{product.targetPrice ? formatCurrency(Number(product.targetPrice)) : "—"}</p>
        </div>

        {/* Suggestion */}
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider lg:hidden">Suggestion</p>
          {hasSuggestion ? (
            <div>
              <p className="text-[12px] text-zinc-300">
                <span className="line-through text-zinc-600 mr-1.5">{formatCurrency(Number(product.targetPrice))}</span>
                <span className="font-semibold text-emerald-400 tabular-nums">
                  {formatCurrency(product._suggestion.suggestedPrice!)}
                </span>
                <span className="text-zinc-500 ml-1.5">(-{Math.round(product._suggestion.suggestedDiscount * 100)}%)</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Marge apres: <span className={product._suggestion.marginAfterDiscount && product._suggestion.marginAfterDiscount > 0 ? "text-emerald-400" : "text-red-400"}>
                  {formatCurrency(product._suggestion.marginAfterDiscount ?? 0)}
                </span>
                {product._suggestion.marginAfterDiscountPct !== null && (
                  <span className="ml-1">({product._suggestion.marginAfterDiscountPct}%)</span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 italic">{product._suggestion.suggestedAction}</p>
          )}
        </div>

        {/* Action */}
        <div className="flex justify-end">
          {hasSuggestion && !applied && (
            <button
              onClick={applySuggestion}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Tag size={11} />}
              Appliquer
            </button>
          )}
          {applied && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 rounded-lg whitespace-nowrap">
              <Check size={11} />
              Applique
            </span>
          )}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-red-400 mt-2 px-1">{error}</p>
      )}
    </div>
  );
}
