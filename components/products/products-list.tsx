"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Package, AlertTriangle, LayoutGrid, List,
  ChevronDown, X, Trash2, ArrowUpDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_STATUSES } from "@/lib/data";
import { bulkDeleteProductsAction, bulkUpdateStatusAction } from "@/lib/actions/products";

export type ProductListItem = {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  status: string;
  purchasePrice: string | number;
  targetPrice: string | number | null;
  createdAt: Date | string;
  daysInStock: number;
};

// Palette resserree : zinc (neutre) + rose (actif) + amber (attente) + emerald (succes) + red (echec)
// La distinction passe par couleur ET intensite, pas par variete arc-en-ciel.
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  en_stock: { bg: "bg-zinc-500/12 border-zinc-500/25", text: "text-zinc-300", dot: "bg-zinc-400" },
  en_vente: { bg: "bg-rose-500/12 border-rose-500/25", text: "text-rose-400", dot: "bg-rose-400" },
  reserve: { bg: "bg-amber-500/12 border-amber-500/25", text: "text-amber-400", dot: "bg-amber-400" },
  vendu: { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  expedie: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-300" },
  livre: { bg: "bg-emerald-500/20 border-emerald-500/35", text: "text-emerald-400", dot: "bg-emerald-400" },
  retourne: { bg: "bg-red-500/12 border-red-500/25", text: "text-red-400", dot: "bg-red-400" },
};

const STATUS_LABELS: Record<string, string> = {
  en_stock: "En stock", en_vente: "En vente", reserve: "Reserve",
  vendu: "Vendu", expedie: "Expedie", livre: "Livre", retourne: "Retourne",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.en_stock;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

type SortField = "recent" | "name" | "price_asc" | "price_desc" | "days_in_stock";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "recent", label: "Plus recent" },
  { value: "name", label: "Nom A-Z" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix decroissant" },
  { value: "days_in_stock", label: "Plus ancien en stock" },
];

export default function ProductsList({ products }: { products: ProductListItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [view, setView] = useState<"list" | "grid">("list");
  const [sort, setSort] = useState<SortField>("recent");
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      const matchSearch =
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });

    // Sort
    list = [...list];
    switch (sort) {
      case "name":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "price_asc":
        list.sort((a, b) => Number(a.targetPrice ?? 0) - Number(b.targetPrice ?? 0));
        break;
      case "price_desc":
        list.sort((a, b) => Number(b.targetPrice ?? 0) - Number(a.targetPrice ?? 0));
        break;
      case "days_in_stock":
        list.sort((a, b) => b.daysInStock - a.daysInStock);
        break;
      case "recent":
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [products, searchQuery, statusFilter, sort]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p) => p.id)));
  }

  function handleBulkDelete() {
    if (!confirm(`Supprimer ${selected.size} article${selected.size > 1 ? "s" : ""} ? Action irreversible.`)) return;
    startTransition(async () => {
      await bulkDeleteProductsAction(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleBulkStatus(newStatus: string) {
    startTransition(async () => {
      await bulkUpdateStatusAction(Array.from(selected), newStatus);
      setSelected(new Set());
      setShowStatusMenu(false);
      router.refresh();
    });
  }

  const hasSelection = selected.size > 0;

  return (
    <>
      {/* Search + filters + view toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher (titre, marque, SKU)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-300"
          >
            <option value="all">Tous statuts</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="relative">
            <button onClick={() => setShowSort(!showSort)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 text-zinc-400">
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{SORT_OPTIONS.find((s) => s.value === sort)?.label}</span>
              <ChevronDown size={12} />
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/30 py-1 z-50 min-w-[180px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value}
                      onClick={() => { setSort(opt.value); setShowSort(false); }}
                      className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition ${sort === opt.value ? "text-rose-400 font-medium" : "text-zinc-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
            <button onClick={() => setView("list")}
              className={`p-1.5 rounded transition ${view === "list" ? "bg-[var(--color-accent-muted)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              <List size={14} />
            </button>
            <button onClick={() => setView("grid")}
              className={`p-1.5 rounded transition ${view === "grid" ? "bg-[var(--color-accent-muted)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {hasSelection && (
        <div className="card-static p-3 flex items-center gap-3">
          <span className="text-[12px] text-zinc-400">
            <span className="text-white font-semibold">{selected.size}</span> selectionne{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <div className="relative">
            <button onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium bg-[var(--color-bg-hover)] rounded-md text-zinc-300 hover:text-white">
              Changer statut <ChevronDown size={11} />
            </button>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowStatusMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/30 py-1 z-50 min-w-[160px]">
                  {["en_stock", "en_vente", "reserve"].map((s) => (
                    <button key={s} disabled={isPending}
                      onClick={() => handleBulkStatus(s)}
                      className="w-full px-3 py-1.5 text-left text-[12px] text-zinc-300 hover:bg-[var(--color-bg-hover)] disabled:opacity-50">
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={handleBulkDelete} disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 disabled:opacity-50">
            <Trash2 size={12} />
            Supprimer
          </button>
          <button onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] text-zinc-500">
            <X size={14} />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Package size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun article trouve</p>
        </div>
      ) : view === "list" ? (
        <div className="card-static overflow-hidden">
          {/* Select all header */}
          <div className="flex items-center px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1"
            />
            <span className="ml-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((product) => (
              <div key={product.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-bg-hover)] transition-colors group">
                <input
                  type="checkbox"
                  checked={selected.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1 flex-shrink-0"
                />
                <Link href={`/products/${product.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-zinc-200 truncate group-hover:text-white">{product.title}</p>
                      {product.daysInStock > 30 && !["vendu", "livre", "retourne"].includes(product.status) && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          <AlertTriangle size={9} />
                          {product.daysInStock}j
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-zinc-500 font-mono">{product.sku}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[11px] text-zinc-500">{product.brand}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(product.targetPrice)}</p>
                    <p className="text-[11px] text-zinc-500 tabular-nums">Achat : {formatCurrency(product.purchasePrice)}</p>
                  </div>
                  <div className="flex-shrink-0 sm:w-24 text-right">
                    <StatusBadge status={product.status} />
                    <p className="text-[11px] text-zinc-400 tabular-nums mt-1 sm:hidden">{formatCurrency(product.targetPrice)}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Grid view
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((product) => (
            <div key={product.id} className="card-static p-4 hover:border-[var(--color-border-hover)] transition-all relative group">
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggleSelect(product.id)}
                className="absolute top-3 left-3 w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1 z-10 opacity-0 group-hover:opacity-100 checked:opacity-100"
              />
              <Link href={`/products/${product.id}`}>
                <div className="flex justify-end mb-2">
                  <StatusBadge status={product.status} />
                </div>
                <p className="text-[13px] font-medium text-zinc-200 line-clamp-2 group-hover:text-white min-h-[36px]">{product.title}</p>
                <p className="text-[11px] text-zinc-500 mt-1">{product.brand}</p>
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  <p className="text-[15px] font-bold text-white tabular-nums">{formatCurrency(product.targetPrice)}</p>
                  <p className="text-[11px] text-zinc-500 tabular-nums">Achat : {formatCurrency(product.purchasePrice)}</p>
                </div>
                {product.daysInStock > 30 && !["vendu", "livre", "retourne"].includes(product.status) && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">
                    <AlertTriangle size={10} />
                    Dormant ({product.daysInStock}j)
                  </div>
                )}
                <p className="text-[10px] text-zinc-700 font-mono mt-2">{product.sku}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
