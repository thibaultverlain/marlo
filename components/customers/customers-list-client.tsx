"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users, Star, ArrowUpDown, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type CustomerItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  city: string | null;
  vip: boolean | null;
  totalSpent: string | number | null;
  totalOrders: number | null;
  createdAt: Date | string;
};

const SORT_OPTIONS = [
  { value: "name", label: "Nom A-Z" },
  { value: "recent", label: "Recemment ajoute" },
  { value: "spent_desc", label: "CA decroissant" },
  { value: "orders_desc", label: "Plus de commandes" },
];

const FILTERS = [
  { value: "all", label: "Tous" },
  { value: "vip", label: "VIP" },
  { value: "with_orders", label: "Avec achats" },
];

export default function CustomersListClient({ customers }: { customers: CustomerItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let list = customers.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchSearch =
        search === "" ||
        fullName.includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase()) ||
        c.instagram?.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "vip" && c.vip) ||
        (filter === "with_orders" && (c.totalOrders ?? 0) > 0);
      return matchSearch && matchFilter;
    });

    list = [...list];
    switch (sort) {
      case "recent":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "spent_desc":
        list.sort((a, b) => Number(b.totalSpent ?? 0) - Number(a.totalSpent ?? 0));
        break;
      case "orders_desc":
        list.sort((a, b) => (b.totalOrders ?? 0) - (a.totalOrders ?? 0));
        break;
      case "name":
      default:
        list.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    }
    return list;
  }, [customers, search, filter, sort]);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
              filter === f.value
                ? "bg-[var(--color-accent-muted)] text-rose-400"
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
            placeholder="Rechercher (nom, email, ville, instagram)..."
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
          <Users size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun client trouve</p>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-[12px] font-semibold text-zinc-400 flex-shrink-0">
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium text-zinc-200 truncate">{c.firstName} {c.lastName}</p>
                      {c.vip && <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-500">
                      {c.city && <span>{c.city}</span>}
                      {c.city && c.instagram && <span className="text-zinc-700">·</span>}
                      {c.instagram && <span>{c.instagram}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(c.totalSpent)}</p>
                  <p className="text-[11px] text-zinc-500">{c.totalOrders ?? 0} cmd{(c.totalOrders ?? 0) > 1 ? "s" : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
