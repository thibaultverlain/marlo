"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, Clock, CheckCircle, XCircle, Package, Flame,
  ArrowUpDown, ChevronDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Req = {
  id: string;
  description: string;
  brand: string | null;
  model: string | null;
  status: string | null;
  customerId: string | null;
  customerName: string | null;
  targetBudget: string | null;
  commissionRate: string | null;
  commissionAmount: string | null;
  deadline: string | Date | null;
  createdAt: Date | string;
};

const STATUS_MAP: Record<string, { label: string; cl: string; icon: any }> = {
  ouvert: { label: "Ouvert", cl: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Search },
  en_recherche: { label: "En recherche", cl: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: Clock },
  trouve: { label: "Trouve", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  achete: { label: "Achete", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: Package },
  livre: { label: "Livre", cl: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: CheckCircle },
  facture: { label: "Facture", cl: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: CheckCircle },
  annule: { label: "Annule", cl: "bg-red-500/15 text-red-400 border-red-500/20", icon: XCircle },
};

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "En cours" },
  { value: "to_deliver", label: "A livrer" },
  { value: "closed", label: "Termines" },
];

const SORT_OPTIONS = [
  { value: "urgency", label: "Plus urgent" },
  { value: "recent", label: "Recemment cree" },
  { value: "budget_desc", label: "Budget decroissant" },
];

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  const target = new Date(d).getTime();
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function SourcingListClient({ requests }: { requests: Req[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("urgency");
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let list = requests.filter((r) => {
      const matchSearch =
        search === "" ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.brand?.toLowerCase().includes(search.toLowerCase()) ||
        r.model?.toLowerCase().includes(search.toLowerCase()) ||
        r.customerName?.toLowerCase().includes(search.toLowerCase());

      let matchFilter = true;
      if (filter === "active") matchFilter = ["ouvert", "en_recherche"].includes(r.status ?? "");
      else if (filter === "to_deliver") matchFilter = ["trouve", "achete"].includes(r.status ?? "");
      else if (filter === "closed") matchFilter = ["livre", "facture", "annule"].includes(r.status ?? "");

      return matchSearch && matchFilter;
    });

    list = [...list];
    switch (sort) {
      case "recent":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "budget_desc":
        list.sort((a, b) => Number(b.targetBudget ?? 0) - Number(a.targetBudget ?? 0));
        break;
      case "urgency":
      default:
        list.sort((a, b) => {
          // Active avec deadline proche en premier
          const aDays = a.deadline && ["ouvert", "en_recherche"].includes(a.status ?? "") ? daysUntil(a.deadline) : Infinity;
          const bDays = b.deadline && ["ouvert", "en_recherche"].includes(b.status ?? "") ? daysUntil(b.deadline) : Infinity;
          return (aDays ?? Infinity) - (bDays ?? Infinity);
        });
    }
    return list;
  }, [requests, search, filter, sort]);

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
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Rechercher (description, marque, modele, client)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-200 placeholder:text-zinc-600"
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
              <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/30 py-1 z-50 min-w-[180px]">
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
          <Search size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucune demande trouvee</p>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <span className="text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">
              {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((req) => {
              const st = STATUS_MAP[req.status ?? "ouvert"] ?? STATUS_MAP.ouvert;
              const Icon = st.icon;
              const days = req.deadline ? daysUntil(req.deadline) : null;
              const isActive = ["ouvert", "en_recherche"].includes(req.status ?? "");
              const isUrgent = isActive && days !== null && days <= 3 && days >= 0;
              const isWarning = isActive && days !== null && days <= 7 && days > 3;
              const isOverdue = isActive && days !== null && days < 0;
              const isToDeliver = ["trouve", "achete"].includes(req.status ?? "");

              return (
                <Link
                  key={req.id}
                  href={`/sourcing/${req.id}`}
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
                    isToDeliver ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]" : "hover:bg-[var(--color-bg-hover)]"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-zinc-200 truncate">{req.description}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${st.cl}`}>
                        <Icon size={10} />
                        {st.label}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-300 bg-red-500/15 border border-red-500/20">
                          <Flame size={9} />
                          En retard
                        </span>
                      )}
                      {isUrgent && !isOverdue && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-300 bg-red-500/15">
                          <Flame size={9} />
                          J-{days}
                        </span>
                      )}
                      {isWarning && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-300 bg-amber-500/15">
                          <Clock size={9} />
                          J-{days}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[11px]">
                      {req.brand && <span className="text-zinc-500">{req.brand}</span>}
                      {req.customerName && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-500">Pour {req.customerName}</span>
                        </>
                      )}
                      {req.deadline && !isUrgent && !isWarning && !isOverdue && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-600">Deadline {formatDate(req.deadline)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {req.targetBudget && (
                      <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(req.targetBudget)}</p>
                    )}
                    {req.commissionRate && (
                      <p className="text-[11px] text-zinc-500">
                        {(Number(req.commissionRate) * 100).toFixed(0)}%
                        {req.commissionAmount && ` · ${formatCurrency(req.commissionAmount)}`}
                      </p>
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
