"use client";

import Link from "next/link";
import { Zap, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHANNELS, CATEGORIES } from "@/lib/data";
import type { TopProductRow } from "@/lib/db/queries/sales-analytics";

export default function TopProductsList({ products }: { products: TopProductRow[] }) {
  if (products.length === 0) {
    return (
      <div className="card-static p-8 text-center text-zinc-500 text-sm">
        Pas encore de ventes pour ce classement.
      </div>
    );
  }

  return (
    <div className="card-static divide-y divide-[var(--color-border-subtle)]">
      {products.map((p, idx) => {
        const channel = CHANNELS.find((c) => c.value === p.channel)?.label ?? p.channel;
        const category = CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category;
        return (
          <Link
            key={p.productId}
            href={`/products/${p.productId}`}
            className="flex items-center gap-3 p-4 hover:bg-[var(--color-bg-hover)] transition-colors group"
          >
            <span className="w-6 text-[11px] font-mono text-zinc-600">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                {p.title}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
                {p.brand} · {category} · {channel} · {formatDate(p.soldAt)}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-zinc-500">Marge</p>
              <p className={`text-[12px] font-semibold tabular-nums ${p.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(p.margin)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold tabular-nums whitespace-nowrap">
              <Zap size={10} />
              {p.daysToSell.toFixed(1)}j
            </span>
            <ExternalLink size={11} className="text-zinc-700 group-hover:text-zinc-500 transition-colors opacity-0 group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
