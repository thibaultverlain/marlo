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
  size: string | null;
  status: string;
  listedOn: string[];
  purchasePrice: number;
  targetPrice: number | null;
  daysInStock: number;
  isDormant: boolean;
  thumbnail: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const st = PRODUCT_STATUSES.find((s) => s.value === status);
  if (!st) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white ${st.color}`}>
      {st.label}
    </span>
  );
}

function ChannelTag({ channel }: { channel: string }) {
  const ch = CHANNELS.find((c) => c.value === channel);
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-500">
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, marque, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-white border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="all">Tous les statuts</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden mt-6">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map((product) => {
              const expectedMargin =
                product.targetPrice && product.purchasePrice > 0
                  ? ((product.targetPrice - product.purchasePrice) / product.purchasePrice) * 100
                  : 0;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="flex items-center gap-5 px-6 py-4 hover:bg-stone-50/50 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0 border border-stone-200/50 overflow-hidden">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="text-stone-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-800 truncate group-hover:text-stone-900">{product.title}</p>
                      {product.isDormant && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={10} />
                          {product.daysInStock}j
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-stone-400">{product.sku}</span>
                      <span className="text-stone-200">·</span>
                      <span className="text-xs text-stone-400">{product.brand}</span>
                      {product.size && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-stone-400">{product.size}</span>
                        </>
                      )}
                    </div>
                    {product.listedOn && product.listedOn.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {product.listedOn.map((ch) => (
                          <ChannelTag key={ch} channel={ch} />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-stone-800">{formatCurrency(product.targetPrice)}</p>
                    <p className="text-xs text-stone-400">Achat : {formatCurrency(product.purchasePrice)}</p>
                    {expectedMargin > 0 && (
                      <p className="text-xs text-green-600 font-medium">{formatPercent(expectedMargin)}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-24 text-right">
                    <StatusBadge status={product.status} />
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
