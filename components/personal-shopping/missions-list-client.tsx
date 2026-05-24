"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, ShoppingBag, Calendar, MapPin, Flame, Clock,
  ArrowUpDown, ChevronDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Mission = {
  id: string;
  name: string;
  status: string | null;
  eventDate: string | Date | null;
  location: string | null;
  itemCount: number;
  totalPurchased: string | number | null;
  totalCommission: string | number | null;
  createdAt: Date | string;
};

const STATUS_MAP: Record<string, { label: string; cl: string }> = {
  planifie: { label: "Planifiee", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  en_cours: { label: "En cours", cl: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  termine: { label: "Terminee", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  facture: { label: "Facturee", cl: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  annule: { label: "Annulee", cl: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "upcoming", label: "A venir" },
  { value: "in_progress", label: "En cours" },
  { value: "closed", label: "Termines" },
];

const SORT_OPTIONS = [
  { value: "event_asc", label: "Date proche" },
  { value: "recent", label: "Recemment cree" },
  { value: "commission_desc", label: "Commission decroissante" },
  { value: "total_desc", label: "Total decroissant" },
];

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function MissionsListClient({ missions }: { missions: Mission[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("event_asc");
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let list = missions.filter((m) => {
      const matchSearch =
        search === "" ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.location?.toLowerCase().includes(search.toLowerCase());

      let matchFilter = true;
      if (filter === "upcoming") matchFilter = m.status === "planifie";
      else if (filter === "in_progress") matchFilter = m.status === "en_cours";
      else if (filter === "closed") matchFilter = ["termine", "facture", "annule"].includes(m.status ?? "");

      return matchSearch && matchFilter;
    });

    list = [...list];
    switch (sort) {
      case "recent":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "commission_desc":
        list.sort((a, b) => Number(b.totalCommission ?? 0) - Number(a.totalCommission ?? 0));
        break;
      case "total_desc":
        list.sort((a, b) => Number(b.totalPurchased) - Number(a.totalPurchased));
        break;
      case "event_asc":
      default:
        list.sort((a, b) => {
          const aTime = a.eventDate ? new Date(a.eventDate).getTime() : Infinity;
          const bTime = b.eventDate ? new Date(b.eventDate).getTime() : Infinity;
          return aTime - bTime;
        });
    }
    return list;
  }, [missions, search, filter, sort]);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
              filter === f.value
                ? "bg-[rgba(225,29,72,0.12)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher (nom, lieu)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 text-zinc-400"
          >
            <ArrowUpDown size={13} />
            <span className="hidden sm:inline">{SORT_OPTIONS.find((s) => s.value === sort)?.label}</span>
            <ChevronDown size={12} />
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/30 py-1 z-50 min-w-[200px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setShowSort(false); }}
                    className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition ${sort === opt.value ? "text-rose-400 font-medium" : "text-zinc-300"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucune mission trouvee</p>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((m) => {
              const st = STATUS_MAP[m.status ?? "planifie"] ?? STATUS_MAP.planifie;
              const days = m.eventDate ? daysUntil(m.eventDate) : null;
              const isActive = ["planifie", "en_cours"].includes(m.status ?? "");
              const isImminent = isActive && days !== null && days >= 0 && days <= 3;
              const isSoon = isActive && days !== null && days > 3 && days <= 7;
              const isPast = isActive && days !== null && days < 0;

              return (
                <Link
                  key={m.id}
                  href={`/personal-shopping/${m.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-zinc-200 truncate">{m.name}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${st.cl}`}>
                        {st.label}
                      </span>
                      {isPast && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-300 bg-red-500/15">
                          <Flame size={9} />
                          En retard
                        </span>
                      )}
                      {isImminent && !isPast && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-300 bg-amber-500/15">
                          <Flame size={9} />
                          J-{days}
                        </span>
                      )}
                      {isSoon && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-300/80 bg-amber-500/10">
                          <Clock size={9} />
                          J-{days}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 flex-wrap">
                      {m.eventDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(m.eventDate)}
                        </span>
                      )}
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {m.location}
                        </span>
                      )}
                      <span>{m.itemCount} article{m.itemCount > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(m.totalPurchased)}</p>
                    {Number(m.totalCommission ?? 0) > 0 && (
                      <p className="text-[11px] text-rose-400 tabular-nums">+{formatCurrency(m.totalCommission)}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
