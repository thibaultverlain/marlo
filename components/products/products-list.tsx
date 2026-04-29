"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Package, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { PRODUCT_STATUSES, CHANNELS } from "@/lib/data";

export type ProductListItem = {
  id: string;
  sku: string;
  title: string;
  brand: string;
  category: string;
  status: string;
  purchasePrice: string | number;
  targetPrice: string | number | null;
  daysInStock: number;
};

function StatusBadge({ status }: { status: string }) {
  const st = PRODUCT_STATUSES.find((s) => s.value === status);
  if (!st) return null;
  const darkColors: Record<string, string> = {
    "bg-blue-600": "bg-blue-500/15 text-blue-400",
    "bg-emerald-600": "bg-emerald-500/15 text-emerald-400",
    "bg-amber-600": "bg-amber-500/15 text-amber-400",
    "bg-green-700": "bg-green-500/15 text-green-400",
    "bg-teal-600": "bg-teal-500/15 text-teal-400",
    "bg-stone-500": "bg-zinc-500/15 text-zinc-400",
    "bg-red-600": "bg-red-500/15 text-red-400",
  };
  const className = darkColors[st.color] ?? "bg-zinc-500/15 text-zinc-400";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${className}`}>
      {st.label}
    </span>
  );
}

function ChannelTag({ channel }: { channel: string }) {
  const ch = CHANNELS.find((c) => c.value === channel);
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-500">
      {ch?.label ?? channel}
    </span>
  );
}

export default function ProductsList({ products }: { products: ProductListItem[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [products, searchQuery, statusFilter]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-zinc-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-300"
          >
            <option value="all">Tous les statuts</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-static overflow-hidden mt-6">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((product) => {
              const pp = Number(product.purchasePrice) || 0;
              const tp = Number(product.targetPrice) || 0;
              const expectedMargin = tp > 0 && pp > 0 ? ((tp - pp) / pp) * 100 : 0;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 row-hover transition-colors group"
                >
                  <div className="w-12 h-12 rounded-lg bg-zinc-800/50 flex items-center justify-center flex-shrink-0 border border-[var(--color-border)] overflow-hidden">
                    <Package size={18} className="text-zinc-700" />
                  </div>

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
                      <span className="text-[11px] text-zinc-600 font-mono">{product.sku}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-[11px] text-zinc-500">{product.brand}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(product.targetPrice)}</p>
                    <p className="text-[11px] text-zinc-600 tabular-nums">Achat : {formatCurrency(product.purchasePrice)}</p>
                    {expectedMargin > 0 && (
                      <p className="text-[11px] text-emerald-400 font-medium tabular-nums">{formatPercent(expectedMargin)}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 sm:w-24 text-right">
                    <StatusBadge status={product.status} />
                    <p className="text-[11px] text-zinc-400 tabular-nums mt-1 sm:hidden">{formatCurrency(product.targetPrice)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
