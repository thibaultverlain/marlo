"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ArrowUpDown, Filter, X, Check } from "lucide-react";

/**
 * ListToolbar — barre d'outils standardisee pour les listes (search + sort + filter).
 *
 * Plutot que de dupliquer cette logique dans chaque liste, ce composant la centralise.
 * Les listes existantes (products, sales, customers) ont leur propre logique inline
 * pour eviter un refactor risque. A utiliser pour les NOUVELLES listes.
 *
 * Usage :
 *   <ListToolbar
 *     searchValue={search}
 *     onSearchChange={setSearch}
 *     searchPlaceholder="Rechercher..."
 *     sortOptions={[
 *       { value: "recent", label: "Plus recent" },
 *       { value: "name", label: "Nom A-Z" },
 *     ]}
 *     sortValue={sort}
 *     onSortChange={setSort}
 *     filters={[
 *       { value: "all", label: "Tous" },
 *       { value: "active", label: "Actifs" },
 *     ]}
 *     filterValue={filter}
 *     onFilterChange={setFilter}
 *     resultCount={items.length}
 *   />
 */

export type ListToolbarOption = { value: string; label: string };

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  sortOptions,
  sortValue,
  onSortChange,
  filters,
  filterValue,
  onFilterChange,
  resultCount,
  rightSlot,
}: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  sortOptions?: ListToolbarOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  filters?: ListToolbarOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  resultCount?: number;
  rightSlot?: React.ReactNode;
}) {
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const sortLabel = sortOptions?.find((o) => o.value === sortValue)?.label;
  const filterLabel = filters?.find((f) => f.value === filterValue)?.label;
  const hasActiveFilter = filterValue && filterValue !== "all" && filterValue !== "";

  return (
    <div className="card-static p-3 flex flex-wrap items-center gap-2">
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg text-[13px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-[var(--color-bg-hover)]"
              aria-label="Effacer la recherche"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Filter dropdown */}
      {filters && filters.length > 0 && onFilterChange && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg border transition-all ${
              hasActiveFilter
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : "bg-[var(--color-bg-raised)] border-[var(--color-border)] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Filter size={12} />
            {filterLabel ?? "Filtrer"}
          </button>
          {showFilter && (
            <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl py-1 z-30">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => { onFilterChange(f.value); setShowFilter(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:bg-[var(--color-bg-hover)] ${
                    f.value === filterValue ? "text-rose-400 font-semibold" : "text-zinc-300"
                  }`}
                >
                  <span className="flex-1">{f.label}</span>
                  {f.value === filterValue && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sort dropdown */}
      {sortOptions && sortOptions.length > 0 && onSortChange && (
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-lg border bg-[var(--color-bg-raised)] border-[var(--color-border)] text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <ArrowUpDown size={12} />
            {sortLabel ?? "Trier"}
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl py-1 z-30">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { onSortChange(o.value); setShowSort(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors hover:bg-[var(--color-bg-hover)] ${
                    o.value === sortValue ? "text-rose-400 font-semibold" : "text-zinc-300"
                  }`}
                >
                  <span className="flex-1">{o.label}</span>
                  {o.value === sortValue && <Check size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Right slot pour actions custom */}
      {rightSlot}

      {/* Count a droite */}
      {typeof resultCount === "number" && (
        <span className="text-[11px] text-zinc-500 ml-auto">
          {resultCount} resultat{resultCount > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
