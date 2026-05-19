"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, FileText, Download, ArrowUpDown, ChevronDown, Flame } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  status: string | null;
  amountTtc: string;
  createdAt: Date | string;
};

const STATUS_MAP: Record<string, { label: string; cl: string }> = {
  brouillon: { label: "Brouillon", cl: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  envoyee: { label: "Envoyee", cl: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  payee: { label: "Payee", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  annulee: { label: "Annulee", cl: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "brouillon", label: "Brouillons" },
  { value: "envoyee", label: "Envoyees" },
  { value: "payee", label: "Payees" },
  { value: "annulee", label: "Annulees" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Plus recent" },
  { value: "oldest", label: "Plus ancien" },
  { value: "amount_desc", label: "Montant decroissant" },
  { value: "amount_asc", label: "Montant croissant" },
  { value: "customer", label: "Client A-Z" },
];

function daysSince(d: Date | string): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

export default function InvoicesListClient({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let list = invoices.filter((inv) => {
      const matchSearch =
        search === "" ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || inv.status === filter;
      return matchSearch && matchFilter;
    });

    list = [...list];
    switch (sort) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "amount_desc":
        list.sort((a, b) => Number(b.amountTtc) - Number(a.amountTtc));
        break;
      case "amount_asc":
        list.sort((a, b) => Number(a.amountTtc) - Number(b.amountTtc));
        break;
      case "customer":
        list.sort((a, b) => (a.customerName ?? "zzz").localeCompare(b.customerName ?? "zzz"));
        break;
      case "recent":
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [invoices, search, filter, sort]);

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
            placeholder="Rechercher (numero, client)..."
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
          <FileText size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucune facture trouvee</p>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <span className="text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">
              {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((inv) => {
              const st = STATUS_MAP[inv.status ?? "brouillon"];
              const days = daysSince(inv.createdAt);
              const isOverdue = inv.status === "envoyee" && days > 30;

              return (
                <div key={inv.id} className={`flex items-center justify-between px-5 py-3.5 transition-colors group ${isOverdue ? "bg-red-500/[0.03] hover:bg-red-500/[0.06]" : "hover:bg-[var(--color-bg-hover)]"}`}>
                  <Link href={`/invoices/${inv.id}`} className="flex-1 flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      inv.status === "payee" ? "bg-emerald-500/10" :
                      inv.status === "envoyee" ? "bg-blue-500/10" :
                      inv.status === "annulee" ? "bg-red-500/10" :
                      "bg-[var(--color-bg-hover)]"
                    }`}>
                      <FileText size={16} className={
                        inv.status === "payee" ? "text-emerald-400" :
                        inv.status === "envoyee" ? "text-blue-400" :
                        inv.status === "annulee" ? "text-red-400" :
                        "text-zinc-500"
                      } />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-zinc-200 truncate">{inv.invoiceNumber}</p>
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-300 bg-red-500/15">
                            <Flame size={9} />
                            {days}j
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-zinc-500">{inv.customerName ?? "Sans client"}</span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-[11px] text-zinc-600">{formatDate(inv.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-md text-[11px] font-medium border ${st.cl}`}>
                      {st.label}
                    </span>
                    <p className="text-[13px] font-medium text-white tabular-nums sm:w-24 text-right">{formatCurrency(inv.amountTtc)}</p>
                    <a
                      href={`/api/invoices/${inv.id}/pdf?download=1`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-[var(--color-bg-hover)] transition-colors"
                      title="Telecharger PDF"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
