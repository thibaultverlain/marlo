"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Trophy, Medal, Award } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BestSellerRow } from "@/lib/db/queries/sales-analytics";
import { CATEGORIES } from "@/lib/data";

type SortKey = keyof Pick<BestSellerRow, "rotationScore" | "unitsSold" | "totalRevenue" | "totalMargin" | "avgDaysToSell">;

// Or / Argent / Bronze — distinction par intensite de l'amber/zinc
const PODIUM = [
  { icon: Trophy, color: "text-amber-300", bg: "bg-amber-400/20" },  // or
  { icon: Medal,  color: "text-zinc-300",  bg: "bg-zinc-400/15" },   // argent
  { icon: Award,  color: "text-amber-500", bg: "bg-amber-600/15" },  // bronze
];

export default function BestSellersTable({
  rows,
  groupBy,
}: {
  rows: BestSellerRow[];
  groupBy: "brand" | "category";
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rotationScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const label = groupBy === "category"
          ? CATEGORIES.find((c) => c.value === r.key)?.label ?? r.key
          : r.label;
        return { ...r, label };
      }),
    [rows, groupBy],
  );

  const sorted = useMemo(() => {
    return [...enriched].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [enriched, sortKey, sortDir]);

  function toggle(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  if (rows.length === 0) {
    return (
      <div className="card-static p-8 text-center text-zinc-500 text-sm">
        Pas de donnees pour le moment.
      </div>
    );
  }

  return (
    <div className="card-static overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] data-table">
          <thead className="bg-[var(--color-bg-raised)] border-b border-[var(--color-border)]">
            <tr className="text-left">
              <Th>#</Th>
              <Th>{groupBy === "brand" ? "Marque" : "Categorie"}</Th>
              <ThSort active={sortKey === "unitsSold"} dir={sortDir} onClick={() => toggle("unitsSold")}>Unites</ThSort>
              <ThSort active={sortKey === "totalRevenue"} dir={sortDir} onClick={() => toggle("totalRevenue")}>CA</ThSort>
              <ThSort active={sortKey === "totalMargin"} dir={sortDir} onClick={() => toggle("totalMargin")}>Marge</ThSort>
              <ThSort active={sortKey === "avgDaysToSell"} dir={sortDir} onClick={() => toggle("avgDaysToSell")}>Duree moy.</ThSort>
              <Th>Prix moy.</Th>
              <ThSort active={sortKey === "rotationScore"} dir={sortDir} onClick={() => toggle("rotationScore")}>Score rotation</ThSort>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => {
              const podium = idx < 3 ? PODIUM[idx] : null;
              const Icon = podium?.icon;
              return (
                <tr key={row.key} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-hover)]">
                  <td className="px-4 py-3">
                    {podium && Icon ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${podium.bg}`}>
                        <Icon size={13} className={podium.color} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 text-zinc-500 text-[11px] font-mono">{idx + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white capitalize">{row.label}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{row.unitsSold}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300 font-medium">{formatCurrency(row.totalRevenue)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={row.totalMargin >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {formatCurrency(row.totalMargin)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400">{row.avgDaysToSell.toFixed(1)}j</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-500 text-[12px]">{formatCurrency(row.avgSalePrice)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="font-semibold text-rose-300">{row.rotationScore.toFixed(1)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-[var(--color-bg-raised)]/50 border-t border-[var(--color-border-subtle)] text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-400">Score rotation</span> = CA / duree moyenne de vente. Plus le score est haut, plus tu generes de cash rapidement sur ce groupe.
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{children}</th>;
}

function ThSort({ active, dir, onClick, children }: { active: boolean; dir: "asc" | "desc"; onClick: () => void; children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5">
      <button onClick={onClick} className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${active ? "text-zinc-200" : "text-zinc-500"}`}>
        {children}
        <ArrowUpDown size={9} className={active ? "" : "opacity-30"} />
      </button>
    </th>
  );
}
